import { Request, Response } from "express";
import prisma from "../../config/db";
import { uploadPublicFileToS3 } from "@utils/s3.utils";
import { NotificationService } from "../../services/notification.service";
import { logger } from "../../utils/logger";
import { Role } from "@generated/prisma/client";
import { canAccessCourse, canManageCourse, isPlatformAdmin } from "../../services/access.service";
import { basicUserSelect } from "../../utils/user.select";

export const getPublicCoursesController = async (_req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      where: { isPublished: true, isActive: true, isDeleted: false },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        category: true,
        priceInPaise: true,
        currency: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, courses });
  } catch (error) {
    logger.error("Failed to fetch public courses:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch courses." });
  }
};

export const createCourseController = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      priceInPaise,
      currency,
      startDate,
      endDate,
      isPublished,
    } = req.body;
    const user = req.user!;

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    let thumbnailUrl: string | undefined;
    if (req.file) {
      thumbnailUrl = await uploadPublicFileToS3(
        req.file.buffer,
        req.file.mimetype,
        `course-thumbnails/${Date.now()}-${req.file.originalname}`,
      );
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        category,
        priceInPaise,
        currency,
        thumbnailUrl,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isPublished: isPublished ?? false,
        createdById: user.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      course: newCourse,
    });
  } catch (error) {
    logger.error("Error creating course:", error);
    return res.status(500).json({ success: false, message: "Failed to create course." });
  }
};

export const getAllCoursesController = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const assignmentFilter =
      user.role === Role.TEACHER
        ? { OR: [{ createdById: user.id }, { teachers: { some: { teacherId: user.id } } }] }
        : user.role === Role.ASSISTANT
          ? { assistants: { some: { assistantId: user.id } } }
          : {};
    const courses = await prisma.course.findMany({
      where: {
        isDeleted: false,
        ...assignmentFilter,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json({ success: true, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch courses." });
  }
};

export const getCourseByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || !(await canAccessCourse(req.user, id))) {
      return res.status(403).json({ success: false, message: "You cannot access this course." });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!course || course.isDeleted) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    res.status(200).json({ success: true, course });
  } catch (error) {
    logger.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: "Failed to fetch course." });
  }
};

export const getEnrolledUsersCountController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const enrolledUsersCount = await prisma.courseEnrollment.count({
      where: {
        courseId: courseId,
      },
    });

    res.status(200).json({
      success: true,
      courseId,
      enrolledUsersCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrolled user count.",
      error: error,
    });
  }
};

export const updateCourseController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      priceInPaise: req.body.priceInPaise,
      currency: req.body.currency,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      isPublished: req.body.isPublished,
      isActive: req.body.isActive,
    };

    Object.keys(updateData).forEach((key) => {
      const typedKey = key as keyof typeof updateData;
      if (updateData[typedKey] === undefined || updateData[typedKey] === "") {
        delete updateData[typedKey];
      }
    });

    if (req.file) {
      const key = `courses/${Date.now()}_${req.file.originalname}`;
      (updateData as typeof updateData & { thumbnailUrl?: string }).thumbnailUrl =
        await uploadPublicFileToS3(req.file.buffer, req.file.mimetype, key);
    }

    const updatedCourse = await prisma.course.update({
      where: { id, isDeleted: false },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      course: updatedCourse,
    });
  } catch (error: unknown) {
    logger.error("Unexpected error", error);
    return res.status(400).json({
      success: false,
      message: "Failed to update course.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteCourseController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.course.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
        isPublished: false,
      },
    });

    res.status(200).json({ success: true, message: "Course soft-deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete course." });
  }
};

export const enrollStudentController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { studentEmail } = req.body;

    const student = await prisma.user.findFirst({
      where: {
        email: String(studentEmail).trim().toLowerCase(),
        role: Role.STUDENT,
        isDeleted: false,
        isSuspended: false,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false, isActive: true },
      select: { id: true },
    });
    if (!course) {
      return res.status(404).json({ success: false, message: "Active course not found." });
    }

    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId: courseId,
        },
      },
    });

    if (existingEnrollment) {
      return res
        .status(400)
        .json({ success: false, message: "User is already enrolled in this course." });
    }

    const newEnrollment = await prisma.courseEnrollment.create({
      data: {
        userId: student.id,
        courseId: courseId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in course.",
      enrollment: newEnrollment,
    });
  } catch (error) {
    logger.error("❌ Enrollment error:", error);
    res.status(500).json({ success: false, message: "Failed to enroll in course." });
  }
};

export const getCourseForEnrolledUserController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    if (!(await canAccessCourse(req.user!, courseId))) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not enrolled in this course.",
      });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          select: { id: true, title: true },
        },
        enrollments: {
          where: { userId },
          select: { status: true, enrolledAt: true, progress: true },
        },
      },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    res.status(200).json({ success: true, course });
  } catch (error) {
    logger.error("Error in getCourseForEnrolledUserController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve course details.",
    });
  }
};

export const getMyCoursesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. User ID not found." });
    }

    const myCourses = await prisma.courseEnrollment.findMany({
      where: {
        userId,
        course: { isDeleted: false, isActive: true, isPublished: true },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            isPublished: true,
          },
        },
      },
    });
    const courses = myCourses.filter((e) => e.course !== null).map((e) => e.course);

    res.status(200).json({ success: true, courses });
  } catch (error: unknown) {
    logger.error("Error retrieving user courses:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve user courses." });
  }
};

export const getCurrentUserCoursesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const staffAccess = isPlatformAdmin(req.user!);
    const currentUserAccess = staffAccess
      ? {}
      : {
          OR: [
            { createdById: userId },
            { enrollments: { some: { userId } } },
            { teachers: { some: { teacherId: userId } } },
            { assistants: { some: { assistantId: userId } } },
          ],
        };
    const courses = await prisma.course.findMany({
      where: {
        ...currentUserAccess,
        isDeleted: false,
        ...(req.user!.role === Role.STUDENT ? { isPublished: true, isActive: true } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnailUrl: true,
        isPublished: true,
        startDate: true,
        endDate: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        enrollments: {
          select: {
            userId: true,
            status: true,
            enrolledAt: true,
            progress: true,
          },
        },
      },
    });

    const formattedCourses = courses.map((course) => {
      const myEnrollment = course.enrollments.find((e) => e.userId === userId);

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        isPublished: course.isPublished,
        createdBy: course.createdBy,
        isEnrolled: !!myEnrollment,
        enrollmentStatus: myEnrollment?.status || null,
        enrollmentDate: myEnrollment?.enrolledAt || null,
        progress: myEnrollment?.progress ?? 0,
        startDate: course.startDate || null,
        endDate: course.endDate || null,
      };
    });

    res.status(200).json({
      success: true,
      courses: formattedCourses,
    });
  } catch (error) {
    logger.error("❌ Error fetching user courses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user courses.",
    });
  }
};

export const enrollUserByEmailController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: String(email).trim().toLowerCase(),
        role: Role.STUDENT,
        isDeleted: false,
        isSuspended: false,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId,
        },
      },
    });

    if (existingEnrollment) {
      return res
        .status(400)
        .json({ success: false, message: "User is already enrolled in this course" });
    }

    const newEnrollment = await prisma.courseEnrollment.create({
      data: {
        userId: user.id,
        courseId: courseId,
      },
    });

    res.status(201).json({
      success: true,
      message: `User ${user.name} has been enrolled successfully`,
      enrollment: newEnrollment,
    });
  } catch (error) {
    logger.error("Enroll by email error:", error);
    res.status(500).json({ success: false, message: "Failed to enroll user" });
  }
};

export const selfEnrollController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.id;

    if (req.user!.role !== Role.STUDENT) {
      return res.status(403).json({ success: false, message: "Only learners can enroll." });
    }
    if (process.env.ALLOW_SELF_ENROLLMENT !== "true") {
      return res.status(403).json({
        success: false,
        message: "Self-enrollment is disabled. Contact the admissions team for access.",
      });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false, isActive: true, isPublished: true },
      select: { id: true },
    });
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course is not open for enrollment." });
    }

    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return res
        .status(400)
        .json({ success: false, message: "You are already enrolled in this course." });
    }

    const newEnrollment = await prisma.courseEnrollment.create({
      data: {
        userId,
        courseId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in course.",
      enrollment: newEnrollment,
    });
  } catch (error) {
    logger.error("Error in selfEnrollController:", error);
    res.status(500).json({ success: false, message: "Failed to enroll in course." });
  }
};

export const enrollUserByIdController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, role: Role.STUDENT, isDeleted: false, isSuspended: false },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId, isDeleted: false, isPublished: true },
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not available for enrollment.",
      });
    }

    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: `User ${user.name || user.email} is already enrolled in this course.`,
      });
    }

    const newEnrollment = await prisma.courseEnrollment.create({
      data: {
        userId,
        courseId,
        status: "IN_PROGRESS",
        progress: 0,
      },
    });

    res.status(201).json({
      success: true,
      message: `User ${user.name || user.email} successfully enrolled in course.`,
      enrollment: newEnrollment,
    });
  } catch (error) {
    logger.error("Error in enrollUserByIdController:", error);
    res.status(500).json({ success: false, message: "Failed to enroll user in course." });
  }
};

export const getTeacherAssignedCoursesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const assignments = await prisma.courseTeacher.findMany({
      where: {
        teacherId: userId,
      },
      include: {
        course: true,
      },
    });

    const validCourses = assignments
      .filter(
        (assignment: { course: { isDeleted: any } }) =>
          assignment.course && !assignment.course.isDeleted,
      )
      .map((assignment: { course: any }) => assignment.course);

    res.status(200).json({ success: true, courses: validCourses });
  } catch (error) {
    logger.error("Failed to fetch assigned courses:", error);
    res.status(500).json({ success: false, message: "Failed to fetch assigned courses." });
  }
};

export const assignTeacherToCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { teacherId } = req.body;
    const user = (req as any).user;
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can assign teachers to courses.",
      });
    }
    const teacherUser = await prisma.user.findFirst({
      where: { id: teacherId, role: "TEACHER" },
    });
    if (!teacherUser) {
      return res.status(404).json({
        success: false,
        message: "User is not a Teacher or does not exist.",
      });
    }
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }
    const existingAssignment = await prisma.courseTeacher.findFirst({
      where: { courseId, teacherId },
    });
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: "Teacher is already assigned to this course.",
      });
    }
    await prisma.courseTeacher.create({
      data: { courseId, teacherId },
    });
    await NotificationService.notifyTeacherCourseAssignment(
      teacherId,
      courseId,
      course.title,
      user.name || "Administrator",
      {
        assignedById: user.id,
        courseDescription: `You have been assigned to teach this course by ${user.role === "SUPER_ADMIN" ? "Super Administrator" : "Administrator"}.`,
      },
    );

    res.status(200).json({
      success: true,
      message: "Teacher has been assigned to the course and notified.",
    });
  } catch (error) {
    logger.error("Error assigning teacher to course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign teacher to course.",
    });
  }
};

export const removeTeacherFromCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId, teacherId } = req.params;
    const user = (req as any).user;
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can remove teachers from courses.",
      });
    }
    const assignment = await prisma.courseTeacher.findFirst({
      where: { courseId, teacherId },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Teacher is not assigned to this course.",
      });
    }

    await prisma.courseTeacher.delete({
      where: { id: assignment.id },
    });

    res.status(200).json({
      success: true,
      message: "Teacher has been removed from the course.",
    });
  } catch (error) {
    logger.error("Error removing teacher from course:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove teacher from course.",
    });
  }
};

const parsePositiveOrder = (value: unknown, fallback = 1): number | null => {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getCourseModulesController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!req.user || !(await canAccessCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot access this course." });
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        createdAt: true,
        chapters: {
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            createdAt: true,
            _count: { select: { recordedLectures: true } },
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
        _count: { select: { contents: true, recordedLectures: true, chapters: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return res.status(200).json({ success: true, modules });
  } catch (error) {
    logger.error("Failed to fetch course subjects:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch course subjects." });
  }
};

export const createCourseModuleController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const title = String(req.body.title || "").trim();
    const order = parsePositiveOrder(req.body.order);
    if (!title || !order) {
      return res.status(400).json({
        success: false,
        message: "Subject title and a positive order number are required.",
      });
    }
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot manage this course." });
    }

    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        order,
        description: req.body.description ? String(req.body.description).trim() : undefined,
      },
      include: { chapters: true },
    });
    return res.status(201).json({ success: true, module });
  } catch (error) {
    logger.error("Failed to create course subject:", error);
    return res.status(500).json({ success: false, message: "Failed to create course subject." });
  }
};

export const updateCourseModuleController = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot manage this course." });
    }
    const existing = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }
    const title = req.body.title === undefined ? undefined : String(req.body.title).trim();
    const order =
      req.body.order === undefined ? undefined : parsePositiveOrder(req.body.order, Number.NaN);
    if (title === "" || order === null) {
      return res.status(400).json({ success: false, message: "Invalid subject title or order." });
    }

    const module = await prisma.module.update({
      where: { id: moduleId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(req.body.description !== undefined
          ? { description: String(req.body.description).trim() || null }
          : {}),
      },
    });
    return res.status(200).json({ success: true, module });
  } catch (error) {
    logger.error("Failed to update course subject:", error);
    return res.status(500).json({ success: false, message: "Failed to update course subject." });
  }
};

export const deleteCourseModuleController = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot manage this course." });
    }
    const existing = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }

    await prisma.$transaction([
      prisma.content.deleteMany({ where: { moduleId } }),
      prisma.recordedLecture.updateMany({
        where: { moduleId },
        data: { moduleId: null, chapterId: null },
      }),
      prisma.module.delete({ where: { id: moduleId } }),
    ]);
    return res.status(200).json({ success: true, message: "Subject deleted." });
  } catch (error) {
    logger.error("Failed to delete course subject:", error);
    return res.status(500).json({ success: false, message: "Failed to delete course subject." });
  }
};

export const createCourseChapterController = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId } = req.params;
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot manage this course." });
    }
    const title = String(req.body.title || "").trim();
    const order = parsePositiveOrder(req.body.order);
    if (!title || !order) {
      return res.status(400).json({
        success: false,
        message: "Chapter title and a positive order number are required.",
      });
    }
    const subject = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found." });
    }
    const chapter = await prisma.chapter.create({
      data: {
        moduleId,
        title,
        order,
        description: req.body.description ? String(req.body.description).trim() : undefined,
      },
    });
    return res.status(201).json({ success: true, chapter });
  } catch (error) {
    logger.error("Failed to create course chapter:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create chapter. Its order may already be in use.",
    });
  }
};

export const updateCourseChapterController = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId, chapterId } = req.params;
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot manage this course." });
    }
    const existing = await prisma.chapter.findFirst({
      where: { id: chapterId, moduleId, subject: { courseId } },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Chapter not found." });
    }
    const title = req.body.title === undefined ? undefined : String(req.body.title).trim();
    const order =
      req.body.order === undefined ? undefined : parsePositiveOrder(req.body.order, Number.NaN);
    if (title === "" || order === null) {
      return res.status(400).json({ success: false, message: "Invalid chapter title or order." });
    }
    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(req.body.description !== undefined
          ? { description: String(req.body.description).trim() || null }
          : {}),
      },
    });
    return res.status(200).json({ success: true, chapter });
  } catch (error) {
    logger.error("Failed to update course chapter:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update chapter. Its order may already be in use.",
    });
  }
};

export const deleteCourseChapterController = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId, chapterId } = req.params;
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot manage this course." });
    }
    const existing = await prisma.chapter.findFirst({
      where: { id: chapterId, moduleId, subject: { courseId } },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Chapter not found." });
    }
    await prisma.$transaction([
      prisma.recordedLecture.updateMany({ where: { chapterId }, data: { chapterId: null } }),
      prisma.chapter.delete({ where: { id: chapterId } }),
    ]);
    return res.status(200).json({ success: true, message: "Chapter deleted." });
  } catch (error) {
    logger.error("Failed to delete course chapter:", error);
    return res.status(500).json({ success: false, message: "Failed to delete chapter." });
  }
};

export const assignAssistantToCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { assistantId } = req.body;
    const [course, assistant] = await Promise.all([
      prisma.course.findFirst({
        where: { id: courseId, isDeleted: false },
        select: { id: true, title: true },
      }),
      prisma.user.findFirst({
        where: {
          id: assistantId,
          role: Role.ASSISTANT,
          isDeleted: false,
          isSuspended: false,
        },
        select: basicUserSelect,
      }),
    ]);
    if (!course || !assistant) {
      return res.status(404).json({ success: false, message: "Course or assistant not found." });
    }

    await prisma.courseAssistant.upsert({
      where: { courseId_assistantId: { courseId, assistantId } },
      create: { courseId, assistantId },
      update: {},
    });
    await NotificationService.notifyAssistantCourseAssignment(
      assistantId,
      courseId,
      course.title,
      req.user?.email || "Administrator",
      "TEACHING_ASSISTANT",
      { assignedById: req.user?.id, assignedByRole: req.user?.role },
    );
    return res.status(200).json({ success: true, message: "Assistant assigned to course." });
  } catch (error) {
    logger.error("Failed to assign course assistant:", error);
    return res.status(500).json({ success: false, message: "Failed to assign assistant." });
  }
};

export const getCourseAssistantsController = async (req: Request, res: Response) => {
  try {
    const assistants = await prisma.courseAssistant.findMany({
      where: { courseId: req.params.courseId },
      select: { assistant: { select: basicUserSelect }, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({
      success: true,
      assistants: assistants.map((assignment) => ({
        ...assignment.assistant,
        assignedAt: assignment.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Failed to fetch course assistants:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch assistants." });
  }
};

export const removeAssistantFromCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId, assistantId } = req.params;
    const assignment = await prisma.courseAssistant.findUnique({
      where: { courseId_assistantId: { courseId, assistantId } },
      select: { id: true },
    });
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assistant is not assigned." });
    }
    await prisma.courseAssistant.delete({ where: { id: assignment.id } });
    return res.status(200).json({ success: true, message: "Assistant removed from course." });
  } catch (error) {
    logger.error("Failed to remove course assistant:", error);
    return res.status(500).json({ success: false, message: "Failed to remove assistant." });
  }
};
