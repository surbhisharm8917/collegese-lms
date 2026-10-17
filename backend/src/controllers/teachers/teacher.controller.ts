import { Request, Response } from "express";
import dayjs from "dayjs";
import prisma from "../../config/db";
import { logger } from "../../utils/logger";
import { canManageCourse } from "../../services/access.service";
import { basicUserSelect } from "../../utils/user.select";

/**
 * Authorization guard for teacher-scoped endpoints.
 * A caller may act on `teacherId` only if it is their own id, or if they are an
 * ADMIN/SUPER_ADMIN. Prevents horizontal privilege escalation / IDOR where one
 * teacher (or any authenticated user) manipulates the URL `teacherId`.
 */
const canAccessTeacher = (req: Request, teacherId: string): boolean => {
  const authUser = req.user as { id: string; role: string } | undefined;
  if (!authUser) {
    return false;
  }
  if (authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN") {
    return true;
  }
  return authUser.id === teacherId;
};

const forbiddenTeacher = (res: Response) =>
  res.status(403).json({
    success: false,
    message: "Forbidden: you can only access your own teacher resources.",
  });

export const getTeacherCourses = async (req: Request, res: Response) => {
  const { teacherId } = req.params as Record<string, string>;

  if (!teacherId) {
    return res.status(400).json({ success: false, message: "Teacher ID is required." });
  }

  if (!canAccessTeacher(req, teacherId)) {
    return forbiddenTeacher(res);
  }

  try {
    const courses = await prisma.courseTeacher.findMany({
      where: {
        teacherId: teacherId,
      },
      select: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            recordedLectures: {
              select: {
                id: true,
                title: true,
                duration: true,
                participants: {
                  select: {
                    userId: true,
                    progress: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const teacherCourses = courses.map((ct: { course: any }) => ct.course);

    res.status(200).json({ success: true, courses: teacherCourses });
  } catch (error) {
    logger.error("Error fetching teacher courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve courses due to a server error.",
    });
  }
};

export const getEnrolledStudentsCount = async (req: Request, res: Response) => {
  const { teacherId } = req.params as Record<string, string>;

  if (!teacherId) {
    return res.status(400).json({ success: false, message: "Teacher ID is required." });
  }

  if (!canAccessTeacher(req, teacherId)) {
    return forbiddenTeacher(res);
  }

  try {
    const coursesWithStudentCount = await prisma.course.findMany({
      where: {
        isDeleted: false,
        OR: [{ createdById: teacherId }, { teachers: { some: { teacherId } } }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    const formattedCourses = coursesWithStudentCount.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      totalStudents: course._count.enrollments,
    }));

    res.status(200).json({ success: true, courses: formattedCourses });
  } catch (error) {
    logger.error("Error fetching student count for teacher courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve student count due to a server error.",
    });
  }
};

export const getTeacherLectures = async (req: Request, res: Response) => {
  const { teacherId } = req.params as Record<string, string>;

  if (!teacherId) {
    return res.status(400).json({ success: false, message: "Teacher ID is required." });
  }

  if (!canAccessTeacher(req, teacherId)) {
    return forbiddenTeacher(res);
  }

  try {
    const lectures = await prisma.recordedLecture.findMany({
      where: {
        OR: [
          { teacherId: teacherId },
          {
            course: {
              teachers: {
                some: {
                  teacherId: teacherId,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        courseId: true,
        duration: true,
        createdAt: true,
        teacherId: true,
      },
    });

    res.status(200).json({ success: true, lectures });
  } catch (error) {
    logger.error("Error fetching teacher lectures:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve lectures due to a server error.",
    });
  }
};

export const updateTeacherLecture = async (req: Request, res: Response) => {
  const { teacherId, lectureId } = req.params as Record<string, string>;
  const { title, duration } = req.body;

  if (!teacherId || !lectureId) {
    return res.status(400).json({
      success: false,
      message: "Teacher ID and Lecture ID are required.",
    });
  }

  if (!canAccessTeacher(req, teacherId)) {
    return forbiddenTeacher(res);
  }

  try {
    const lectureToUpdate = await prisma.recordedLecture.findFirst({
      where: {
        id: lectureId,
        course: {
          teachers: {
            some: {
              teacherId: teacherId,
            },
          },
        },
      },
    });

    if (!lectureToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or you do not have permission to edit it.",
      });
    }

    const updatedLecture = await prisma.recordedLecture.update({
      where: { id: lectureId },
      data: {
        ...(title && { title }),
        ...(duration !== undefined && { duration }),
      },
    });

    res.status(200).json({ success: true, updatedLecture });
  } catch (error) {
    logger.error("Error updating teacher lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lecture due to a server error.",
    });
  }
};

export const deleteTeacherLecture = async (req: Request, res: Response) => {
  const { teacherId, lectureId } = req.params as Record<string, string>;

  if (!teacherId || !lectureId) {
    return res.status(400).json({
      success: false,
      message: "Teacher ID and Lecture ID are required.",
    });
  }

  if (!canAccessTeacher(req, teacherId)) {
    return forbiddenTeacher(res);
  }

  try {
    const lectureToDelete = await prisma.recordedLecture.findFirst({
      where: {
        id: lectureId,
        course: {
          teachers: {
            some: {
              teacherId: teacherId,
            },
          },
        },
      },
    });

    if (!lectureToDelete) {
      return res.status(404).json({
        success: false,
        message: "Lecture not found or you do not have permission to delete it.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.lectureProgress.deleteMany({
        where: { recordedLectureId: lectureId },
      });

      await tx.recordedLecture.delete({
        where: { id: lectureId },
      });
    });

    res.status(200).json({ success: true, message: "Lecture deleted successfully." });
  } catch (error) {
    logger.error("Error deleting teacher lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete lecture due to a server error.",
    });
  }
};

export const assignTeacherToLecture = async (req: Request, res: Response) => {
  const { lectureId, teacherId } = req.params as Record<string, string>;

  if (!teacherId || !lectureId) {
    return res
      .status(400)
      .json({ success: false, message: "Teacher ID and Lecture ID are required." });
  }

  try {
    const updatedLecture = await prisma.recordedLecture.update({
      where: { id: lectureId },
      data: { teacherId: teacherId },
      select: {
        id: true,
        title: true,
        teacherId: true,
        courseId: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Teacher assigned to lecture successfully.",
      lecture: updatedLecture,
    });
  } catch (error) {
    logger.error("Error assigning teacher to lecture:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign teacher to lecture due to a server error.",
    });
  }
};

export const getTeacherDashboard = async (req: Request, res: Response) => {
  const teacherId = req.user?.id;
  if (!teacherId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const teacherCourses = await prisma.courseTeacher.findMany({
      where: { teacherId, course: { isDeleted: false } },
      include: {
        course: {
          include: { enrollments: { include: { user: { select: basicUserSelect } } } },
        },
      },
    });

    const courses = teacherCourses.map((tc) => tc.course);
    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c: { isPublished: any }) => c.isPublished).length;
    const draftCourses = courses.filter((c: { isPublished: any }) => !c.isPublished).length;

    let totalEnrollments = 0;
    let newThisMonth = 0;
    let totalProgress = 0;
    const coursesWithEnrollments = courses.map((course) => {
      const students = course.enrollments.map((enroll) => ({
        id: enroll.user.id,
        name: enroll.user.name,
        progress: enroll.progress,
        status: enroll.status,
      }));
      totalEnrollments += students.length;
      totalProgress += students.reduce((acc, s) => acc + s.progress, 0);
      newThisMonth += course.enrollments.filter((enroll) =>
        dayjs(enroll.enrolledAt).isSame(dayjs(), "month"),
      ).length;
      return {
        course: { id: course.id, title: course.title },
        totalEnrollments: students.length,
        students,
      };
    });

    const avgProgress = totalEnrollments ? totalProgress / totalEnrollments : 0;

    const courseIds = courses.map((c) => c.id);

    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [{ createdById: teacherId }, { courseId: { in: courseIds } }],
      },
      include: { submissions: true },
    });
    const totalQuizzes = quizzes.length;
    const totalQuizSubmissions = quizzes.reduce(
      (acc: any, quiz: { submissions: string | any[] }) => acc + quiz.submissions.length,
      0,
    );

    const liveLectures = await prisma.liveLecture.findMany({
      where: {
        isActive: true,
        OR: [{ teacherId }, { courseId: { in: courseIds } }],
      },
    });
    const recordedLectures = await prisma.recordedLecture.findMany({
      where: {
        OR: [{ teacherId }, { courseId: { in: courseIds } }],
      },
      include: { participants: true },
    });
    const now = new Date();
    const upcomingLectures = liveLectures.filter((l) => l.startTime > now).length;
    const pastLectures = liveLectures.filter((l) => l.startTime <= now).length;
    const totalLectures = liveLectures.length + recordedLectures.length;

    const assessments = await prisma.assessment.count({
      where: { course: { teachers: { some: { teacherId } } } },
    });
    const certificates = await prisma.certificate.count({
      where: { course: { teachers: { some: { teacherId } } } },
    });
    const modules = await prisma.module.count({
      where: { course: { teachers: { some: { teacherId } } } },
    });

    const stats = {
      courses: { total: totalCourses, published: publishedCourses, drafts: draftCourses },
      quizzes: { total: totalQuizzes, submissions: totalQuizSubmissions },
      lectures: { total: totalLectures, upcoming: upcomingLectures, past: pastLectures },
      enrollments: { total: totalEnrollments, newThisMonth, avgProgress },
      extra: { assessments, certificates, modules },
    };

    return res.status(200).json({ success: true, stats, coursesWithEnrollments });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStudentLectureProgress = async (req: Request, res: Response) => {
  try {
    const { teacherId, recordedLectureId } = req.params as Record<string, string>;

    if (!teacherId || !recordedLectureId) {
      return res
        .status(400)
        .json({ error: "Missing teacherId or recordedLectureId in parameters" });
    }

    if (!canAccessTeacher(req, teacherId)) {
      return forbiddenTeacher(res);
    }
    const lecture = await prisma.recordedLecture.findUnique({
      where: { id: recordedLectureId },
      select: { courseId: true },
    });
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }
    if (!req.user || !(await canManageCourse(req.user, lecture.courseId))) {
      return res.status(403).json({ message: "You cannot view this lecture's progress." });
    }

    const progressRecords = await prisma.lectureProgress.findMany({
      where: {
        recordedLectureId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (progressRecords.length === 0) {
      return res.status(404).json({ message: "No student progress found for this lecture" });
    }

    res.json({ progress: progressRecords });
  } catch (error) {
    logger.error("Error fetching student lecture progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
