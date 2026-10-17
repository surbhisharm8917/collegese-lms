import { Request, Response } from "express";
import prisma from "../../config/db";
import { v4 as uuidv4 } from "uuid";
import { NotificationService } from "../../services/notification.service";
import { sendLiveLectureScheduledEmail } from "@services/email.service";
import { logger } from "../../utils/logger";
import { Prisma, Role } from "@generated/prisma/client";
import {
  canAccessCourse,
  canAccessLiveLecture,
  canManageLiveLecture,
  isPlatformAdmin,
} from "../../services/access.service";
import { basicUserSelect } from "../../utils/user.select";
import {
  closeLiveKitRoom,
  createLiveKitJoinToken,
  ensureLiveKitRoom,
  isLiveKitConfigured,
  receiveLiveKitWebhook,
  removeLiveKitParticipant,
} from "@services/livekit.service";

const getEventTime = (createdAt: bigint | number | undefined): Date => {
  const milliseconds = Number(createdAt ?? 0) * 1000;
  const date = new Date(milliseconds);
  return Number.isFinite(date.getTime()) && milliseconds > 0 ? date : new Date();
};

const addDeparture = async (
  client: Prisma.TransactionClient | typeof prisma,
  lectureId: string,
  userId: string,
  leftAt: Date,
): Promise<void> => {
  const participant = await client.lectureParticipant.findUnique({
    where: { lectureId_userId: { lectureId, userId } },
    select: { lastJoinedAt: true, leftAt: true },
  });
  if (!participant || participant.leftAt) {
    return;
  }

  const elapsed = Math.max(
    0,
    Math.min(
      24 * 60 * 60,
      Math.floor((leftAt.getTime() - participant.lastJoinedAt.getTime()) / 1000),
    ),
  );
  await client.lectureParticipant.update({
    where: { lectureId_userId: { lectureId, userId } },
    data: { leftAt, durationSeconds: { increment: elapsed } },
  });
};

const closeOpenAttendance = async (
  client: Prisma.TransactionClient,
  lectureId: string,
  leftAt: Date,
): Promise<void> => {
  const activeParticipants = await client.lectureParticipant.findMany({
    where: { lectureId, leftAt: null },
    select: { userId: true },
  });
  await Promise.all(
    activeParticipants.map(({ userId }) => addDeparture(client, lectureId, userId, leftAt)),
  );
};

export const createLiveLecture = async (req: Request, res: Response) => {
  try {
    const { title, courseId, teacherId, startTime, endTime } = req.body;

    // Validate required fields explicitly for a clear 400 instead of a 500.
    if (!courseId || !teacherId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "courseId, teacherId, startTime, and endTime are required.",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid startTime or endTime." });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: "End time must follow start time." });
    }

    const [course, teacher] = await Promise.all([
      prisma.course.findFirst({
        where: { id: courseId, isDeleted: false, isActive: true },
        select: { id: true, title: true },
      }),
      prisma.user.findFirst({
        where: {
          id: teacherId,
          role: Role.TEACHER,
          isDeleted: false,
          isSuspended: false,
          isVerified: true,
        },
        select: { id: true },
      }),
    ]);
    if (!course || !teacher) {
      return res
        .status(400)
        .json({ success: false, message: "Active course or teacher not found." });
    }

    // The client may not send a title; derive one from the course when possible.
    let resolvedTitle: string | undefined = typeof title === "string" ? title.trim() : undefined;
    if (!resolvedTitle && courseId) {
      if (course?.title) {
        resolvedTitle = `Live Lecture - ${course.title}`;
      }
    }
    if (!resolvedTitle) {
      resolvedTitle = "Live Lecture";
    }

    const roomId = uuidv4();

    const lecture = await prisma.liveLecture.create({
      data: {
        title: resolvedTitle,
        courseId,
        teacherId,
        startTime: start,
        endTime: end,
        roomId,
      },
    });

    // Ensure the assigned teacher actually has access to the course they're
    // hosting a lecture for. Without this CourseTeacher link, the teacher
    // cannot see the course (or its content) in their dashboard.
    if (courseId && teacherId) {
      await prisma.courseTeacher
        .upsert({
          where: { courseId_teacherId: { courseId, teacherId } },
          update: {},
          create: { courseId, teacherId },
        })
        .catch((e) => logger.error("Failed to link teacher to course for live lecture:", e));
    }

    if (courseId) {
      await NotificationService.notifyAllCourseStakeholders(
        courseId,
        "LIVE_LECTURE_SCHEDULED",
        "New Live Lecture Scheduled",
        `A new live lecture "${lecture.title}" has been scheduled. Starts at ${start.toLocaleString()}.`,
        {
          lectureId: lecture.id,
          title: lecture.title,
          courseId,
          startTime: lecture.startTime,
          endTime: lecture.endTime,
          roomId: lecture.roomId,
        },
        {
          notifyStudents: true,
          notifyTeachers: true,
          notifyAssistants: true,
          notifyAdmins: false,
          notifySuperAdmins: false,
        },
      );

      prisma.user
        .findMany({
          where: { enrollments: { some: { courseId } } },
          select: { email: true, name: true },
        })
        .then((users) =>
          Promise.allSettled(
            users.map((u) => sendLiveLectureScheduledEmail(u.email, u.name || "User", lecture)),
          ),
        )
        .then((results) => {
          const failed = results.filter((r) => r.status === "rejected");
          if (failed.length > 0) {
            logger.warn(`Failed to send ${failed.length} lecture emails for courseId ${courseId}`);
          }
        })
        .catch((err) => {
          logger.error("Email sending process failed:", err);
        });
    }

    res.status(201).json({ success: true, lecture });
  } catch (error) {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getLiveLecturesByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!req.user || !(await canAccessCourse(req.user, courseId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not enrolled in this course.",
      });
    }

    const lectures = await prisma.liveLecture.findMany({
      where: { courseId },
      orderBy: { startTime: "asc" },
    });

    if (lectures.length === 0) {
      return res.json({
        success: true,
        lectures: [],
        message: "No live lectures scheduled for this course yet.",
      });
    }

    res.json({ success: true, lectures });
  } catch (error) {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const joinLecture = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const userId = req.user!.id;

    const lecture = await prisma.liveLecture.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        title: true,
        roomId: true,
        status: true,
        teacherId: true,
        courseId: true,
        endTime: true,
      },
    });

    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }
    if (!(await canAccessLiveLecture(req.user!, lectureId))) {
      return res.status(403).json({ success: false, message: "You cannot join this lecture." });
    }
    const isHost = lecture.teacherId === userId || isPlatformAdmin(req.user!);
    if (lecture.status === "ENDED") {
      return res.status(410).json({ success: false, message: "This lecture has ended." });
    }
    if (!isHost && lecture.status !== "LIVE") {
      return res.status(409).json({ success: false, message: "This lecture is not live yet." });
    }
    if (!isLiveKitConfigured()) {
      return res.status(503).json({
        success: false,
        message: "The live classroom service is temporarily unavailable.",
      });
    }

    await ensureLiveKitRoom(lecture);

    const account = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!account) {
      return res.status(401).json({ success: false, message: "Account not found." });
    }

    const media = await createLiveKitJoinToken(lecture, req.user!, account.name);

    const participant = await prisma.lectureParticipant.upsert({
      where: { lectureId_userId: { lectureId, userId } },
      update: { lastJoinedAt: new Date(), leftAt: null },
      create: { lectureId, userId, lastJoinedAt: new Date() },
    });

    res.json({
      success: true,
      participant,
      roomId: lecture.roomId,
      token: media.token,
      serverUrl: media.serverUrl,
      permissions: {
        canPublish: media.canPublish,
        canManage: isHost,
      },
    });
  } catch (error) {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * Mark a lecture as LIVE when the host (teacher/admin) starts it.
 * Records the actual start time and notifies enrolled students in real time
 * (DB notification; the socket layer also broadcasts to connected clients).
 */
export const startLiveLecture = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const user = req.user!;

    const lecture = await prisma.liveLecture.findUnique({ where: { id: lectureId } });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }

    // Only the assigned host or an admin may start it.
    if (!(await canManageLiveLecture(user, lectureId))) {
      return res
        .status(403)
        .json({ success: false, message: "Only the assigned teacher can start this lecture." });
    }
    if (lecture.status === "ENDED") {
      return res
        .status(409)
        .json({ success: false, message: "An ended lecture cannot be restarted." });
    }
    if (!isLiveKitConfigured()) {
      return res.status(503).json({
        success: false,
        message: "The live classroom service is not configured.",
      });
    }

    await ensureLiveKitRoom(lecture);

    const updated = await prisma.liveLecture.update({
      where: { id: lectureId },
      data: {
        status: "LIVE",
        isActive: true,
        actualStartTime: lecture.actualStartTime ?? new Date(),
        endedAt: null,
      },
    });

    // Notify enrolled students that the lecture is live now.
    if (lecture.courseId) {
      NotificationService.notifyCourseEnrollees(
        lecture.courseId,
        "LIVE_LECTURE_SCHEDULED",
        "Live Lecture Started",
        `"${lecture.title}" is live now. Join the session.`,
        {
          lectureId: lecture.id,
          title: lecture.title,
          courseId: lecture.courseId,
          roomId: lecture.roomId,
          status: "LIVE",
        },
      ).catch((e) => logger.error("Failed to notify enrollees of live start:", e));
    }

    res.json({ success: true, lecture: updated });
  } catch (error) {
    logger.error("Failed to start live lecture:", error);
    res.status(500).json({ success: false, message: "Failed to start lecture." });
  }
};

/** Mark a lecture as ENDED when the host ends it. */
export const endLiveLecture = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const user = req.user!;

    const lecture = await prisma.liveLecture.findUnique({ where: { id: lectureId } });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }

    if (!(await canManageLiveLecture(user, lectureId))) {
      return res
        .status(403)
        .json({ success: false, message: "Only the assigned teacher can end this lecture." });
    }

    const endedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const ended = await tx.liveLecture.update({
        where: { id: lectureId },
        data: { status: "ENDED", isActive: false, endedAt },
      });
      await closeOpenAttendance(tx, lectureId, endedAt);
      return ended;
    });

    await closeLiveKitRoom(lecture.roomId);

    res.json({ success: true, lecture: updated });
  } catch (error) {
    logger.error("Failed to end live lecture:", error);
    res.status(500).json({ success: false, message: "Failed to end lecture." });
  }
};

export const leaveLecture = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;
    const lecture = await prisma.liveLecture.findUnique({
      where: { id: lectureId },
      select: { id: true },
    });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }

    await addDeparture(prisma, lectureId, req.user!.id, new Date());
    return res.json({ success: true });
  } catch (error) {
    logger.error("Failed to record live lecture departure", error);
    return res.status(500).json({ success: false, message: "Failed to leave lecture." });
  }
};

export const removeLectureParticipant = async (req: Request, res: Response) => {
  try {
    const { lectureId, userId } = req.params;
    if (!(await canManageLiveLecture(req.user!, lectureId))) {
      return res.status(403).json({ success: false, message: "You cannot remove participants." });
    }

    const lecture = await prisma.liveLecture.findUnique({
      where: { id: lectureId },
      select: { roomId: true, teacherId: true },
    });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found." });
    }
    if (lecture.teacherId === userId) {
      return res.status(400).json({ success: false, message: "The host cannot be removed." });
    }

    await removeLiveKitParticipant(lecture.roomId, userId);
    await addDeparture(prisma, lectureId, userId, new Date());
    return res.json({ success: true, message: "Participant removed." });
  } catch (error) {
    logger.error("Failed to remove live lecture participant", error);
    return res.status(500).json({ success: false, message: "Failed to remove participant." });
  }
};

export const handleLiveKitWebhook = async (req: Request, res: Response) => {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ success: false, message: "Raw webhook body required." });
  }

  try {
    const event = await receiveLiveKitWebhook(
      req.body.toString("utf8"),
      req.get("Authorization") ?? undefined,
    );
    const roomName = event.room?.name;
    if (!roomName?.startsWith("lecture-")) {
      return res.status(202).end();
    }

    const roomId = roomName.slice("lecture-".length);
    const lecture = await prisma.liveLecture.findUnique({
      where: { roomId },
      select: { id: true },
    });
    if (!lecture) {
      return res.status(202).end();
    }

    const eventId =
      event.id ||
      `${event.event}:${event.room?.sid ?? roomName}:${event.participant?.sid ?? "room"}:${String(event.createdAt ?? "")}`;
    const occurredAt = getEventTime(event.createdAt);

    await prisma.$transaction(async (tx) => {
      await tx.liveWebhookEvent.create({
        data: { id: eventId, eventType: event.event, lectureId: lecture.id },
      });

      const userId = event.participant?.identity;
      if (event.event === "participant_joined" && userId) {
        await tx.lectureParticipant.upsert({
          where: { lectureId_userId: { lectureId: lecture.id, userId } },
          update: { lastJoinedAt: occurredAt, leftAt: null },
          create: {
            lectureId: lecture.id,
            userId,
            joinedAt: occurredAt,
            lastJoinedAt: occurredAt,
          },
        });
      } else if (
        (event.event === "participant_left" || event.event === "participant_connection_aborted") &&
        userId
      ) {
        await addDeparture(tx, lecture.id, userId, occurredAt);
      } else if (event.event === "room_finished") {
        await closeOpenAttendance(tx, lecture.id, occurredAt);
      }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(200).json({ success: true, duplicate: true });
    }
    logger.error("Rejected LiveKit webhook", error);
    return res.status(401).json({ success: false, message: "Invalid webhook." });
  }
};

export const getLectureParticipants = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;

    if (!req.user || !(await canAccessLiveLecture(req.user, lectureId))) {
      return res.status(403).json({ success: false, message: "You cannot view participants." });
    }

    const participants = await prisma.lectureParticipant.findMany({
      where: { lectureId },
      select: {
        id: true,
        joinedAt: true,
        lastJoinedAt: true,
        leftAt: true,
        durationSeconds: true,
        participant: { select: basicUserSelect },
      },
    });

    res.json({ success: true, participants });
  } catch (error) {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getLiveLecturesByTeacher = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    if (!req.user || (req.user.id !== teacherId && !isPlatformAdmin(req.user))) {
      return res.status(403).json({ success: false, message: "You cannot view these lectures." });
    }

    const lectures = await prisma.liveLecture.findMany({
      where: {
        OR: [{ teacherId }, { course: { teachers: { some: { teacherId } } } }],
      },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const safeLectures = lectures.filter((l) => l.course !== null);

    res.json({ success: true, lectures: safeLectures });
  } catch (error) {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getLiveLectureById = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;

    if (!req.user || !(await canAccessLiveLecture(req.user, lectureId))) {
      return res.status(403).json({ success: false, message: "You cannot access this lecture." });
    }

    const lecture = await prisma.liveLecture.findUnique({
      where: { id: lectureId },
      include: {
        teacher: { select: basicUserSelect },
        course: { select: { id: true, title: true, thumbnailUrl: true } },
      },
    });

    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    res.json({
      success: true,
      lecture,
      permissions: {
        canManage: req.user ? await canManageLiveLecture(req.user, lectureId) : false,
      },
    });
  } catch (error) {
    logger.error("Error fetching lecture:", error);
    res.status(500).json({ message: "Error fetching lecture" });
  }
};

export const getStudentLiveLectures = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });

    if (enrollments.length === 0) {
      return res.json({ success: true, lectures: [] });
    }

    const courseIds = enrollments.map((e) => e.courseId).filter((id): id is string => id !== null);

    const lectures = await prisma.liveLecture.findMany({
      where: {
        courseId: { in: courseIds },
        isActive: true,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({ success: true, lectures });
  } catch (error) {
    logger.error("Unexpected error", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
