import { Role } from "@generated/prisma/client";
import prisma from "../config/db";
import type { AuthUser } from "../types/express";

export const isPlatformAdmin = (user: AuthUser): boolean =>
  user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

export const canManageCourse = async (user: AuthUser, courseId: string): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }
  if (user.role !== Role.TEACHER) {
    return false;
  }

  const assignment = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
      OR: [{ createdById: user.id }, { teachers: { some: { teacherId: user.id } } }],
    },
    select: { id: true },
  });
  return Boolean(assignment);
};

export const canAssistCourse = async (user: AuthUser, courseId: string): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }
  if (user.role === Role.TEACHER) {
    return canManageCourse(user, courseId);
  }
  if (user.role !== Role.ASSISTANT) {
    return false;
  }

  const assignment = await prisma.courseAssistant.findUnique({
    where: { courseId_assistantId: { courseId, assistantId: user.id } },
    select: { id: true },
  });
  return Boolean(assignment);
};

export const canAccessCourse = async (user: AuthUser, courseId: string): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }
  if (user.role === Role.TEACHER) {
    return canManageCourse(user, courseId);
  }
  if (user.role === Role.ASSISTANT) {
    return canAssistCourse(user, courseId);
  }
  if (user.role !== Role.STUDENT) {
    return false;
  }

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId: user.id,
      courseId,
      course: { isDeleted: false, isActive: true, isPublished: true },
    },
    select: { id: true },
  });
  return Boolean(enrollment);
};

export const canManageAssessment = async (
  user: AuthUser,
  assessmentId: string,
): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }
  if (user.role !== Role.TEACHER) {
    return false;
  }

  const assessment = await prisma.assessment.findFirst({
    where: {
      id: assessmentId,
      isDeleted: false,
      OR: [{ createdById: user.id }, { course: { teachers: { some: { teacherId: user.id } } } }],
    },
    select: { id: true },
  });
  return Boolean(assessment);
};

export const canGradeAssessment = async (
  user: AuthUser,
  assessmentId: string,
): Promise<boolean> => {
  if (await canManageAssessment(user, assessmentId)) {
    return true;
  }
  if (user.role !== Role.ASSISTANT) {
    return false;
  }

  const assignment = await prisma.assessmentAssistant.findUnique({
    where: { assessmentId_assistantId: { assessmentId, assistantId: user.id } },
    select: { id: true },
  });
  return Boolean(assignment);
};

export const canManageQuiz = async (user: AuthUser, quizId: string): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }

  const quiz = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      ...(user.role === Role.TEACHER
        ? {
            OR: [
              { createdById: user.id },
              { course: { teachers: { some: { teacherId: user.id } } } },
            ],
          }
        : user.role === Role.ASSISTANT
          ? { course: { assistants: { some: { assistantId: user.id } } } }
          : { id: "__forbidden__" }),
    },
    select: { id: true },
  });
  return Boolean(quiz);
};

export const canManageExam = async (user: AuthUser, examId: string): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      ...(user.role === Role.TEACHER
        ? { course: { teachers: { some: { teacherId: user.id } } } }
        : user.role === Role.ASSISTANT
          ? { course: { assistants: { some: { assistantId: user.id } } } }
          : { id: "__forbidden__" }),
    },
    select: { id: true },
  });
  return Boolean(exam);
};

export const canAccessLiveLecture = async (user: AuthUser, lectureId: string): Promise<boolean> => {
  const lecture = await prisma.liveLecture.findUnique({
    where: { id: lectureId },
    select: { teacherId: true, courseId: true },
  });
  if (!lecture) {
    return false;
  }
  if (isPlatformAdmin(user) || lecture.teacherId === user.id) {
    return true;
  }
  if (!lecture.courseId) {
    return false;
  }
  return canAccessCourse(user, lecture.courseId);
};

export const canManageLiveLecture = async (user: AuthUser, lectureId: string): Promise<boolean> => {
  if (isPlatformAdmin(user)) {
    return true;
  }
  const lecture = await prisma.liveLecture.findUnique({
    where: { id: lectureId },
    select: { teacherId: true, courseId: true },
  });
  if (!lecture || user.role !== Role.TEACHER) {
    return false;
  }
  return (
    lecture.teacherId === user.id ||
    Boolean(lecture.courseId && (await canManageCourse(user, lecture.courseId)))
  );
};
