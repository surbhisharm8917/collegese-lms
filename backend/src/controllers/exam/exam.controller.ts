import crypto from "crypto";
import { ExamAttemptStatus, ExamStatus, Role } from "@generated/prisma/client";
import { Request, Response } from "express";
import { sendExamMail, sendExamResultEmail } from "../../services/email.service";
import {
  generatePresignedUploadUrl,
  generatePresignedViewUrl,
  privateObjectMetadata,
  privateObjectReference,
  deletePrivateObject,
  uploadPrivateFileToS3,
  USE_AZURE_STORAGE,
} from "../../utils/s3.utils";
import prisma from "../../config/db";
import {
  canAccessCourse,
  canManageCourse,
  canManageExam,
  isPlatformAdmin,
} from "../../services/access.service";
import { basicUserSelect } from "../../utils/user.select";
import { logger } from "../../utils/logger";
import { UPLOAD } from "../../utils/constants";
import {
  createUploadReceipt,
  uploadMatchesReceipt,
  verifyUploadReceipt,
} from "../../utils/uploadReceipt";

const OBJECTIVE = "MCQ";
const SUBJECTIVE = "SUBJECTIVE";

const positiveInteger = (value: unknown, fallback?: number): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const optionalDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const examAvailabilityWhere = () => ({
  status: ExamStatus.PUBLISHED,
  AND: [
    { OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }] },
    { OR: [{ dueDate: null }, { dueDate: { gt: new Date() } }] },
  ],
});

const staffCanManageExam = async (req: Request, examId: string): Promise<boolean> =>
  Boolean(req.user && (await canManageExam(req.user, examId)));

const recalculateExamMarks = async (examId: string) => {
  const result = await prisma.examQuestion.aggregate({
    where: { examId },
    _sum: { maxMarks: true },
  });
  const totalMarks = result._sum.maxMarks || 0;
  await prisma.exam.update({ where: { id: examId }, data: { totalMarks } });
  return totalMarks;
};

type ExamQuestionInput = {
  text?: unknown;
  questionType?: unknown;
  options?: unknown;
  maxMarks?: unknown;
  marks?: unknown;
  markingScheme?: unknown;
};

const normalizeQuestion = (input: ExamQuestionInput) => {
  const text = String(input.text || "").trim();
  const questionType = input.questionType === SUBJECTIVE ? SUBJECTIVE : OBJECTIVE;
  const maxMarks = positiveInteger(
    input.maxMarks ?? input.marks,
    questionType === SUBJECTIVE ? 5 : 1,
  );
  if (!text || !maxMarks || maxMarks > 100) {
    throw new Error("Question text and marks from 1 to 100 are required.");
  }
  const options = Array.isArray(input.options)
    ? input.options.map((option: any) => ({
        text: String(option.text || "").trim(),
        isCorrect: option.isCorrect === true,
      }))
    : [];
  if (questionType === OBJECTIVE) {
    if (options.length < 2 || options.some((option) => !option.text)) {
      throw new Error("MCQ questions require at least two non-empty options.");
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      throw new Error("MCQ questions require exactly one correct option.");
    }
  }
  return {
    text,
    questionType,
    maxMarks,
    markingScheme:
      questionType === SUBJECTIVE ? String(input.markingScheme || "").trim() || null : null,
    options,
  };
};

const createQuestionRecord = async (
  examId: string,
  input: ReturnType<typeof normalizeQuestion>,
) => {
  if (input.questionType === SUBJECTIVE) {
    return prisma.examQuestion.create({
      data: {
        examId,
        text: input.text,
        questionType: SUBJECTIVE,
        maxMarks: input.maxMarks,
        markingScheme: input.markingScheme,
      },
      include: { options: true },
    });
  }

  return prisma.$transaction(async (tx) => {
    const question = await tx.examQuestion.create({
      data: {
        examId,
        text: input.text,
        questionType: OBJECTIVE,
        maxMarks: input.maxMarks,
      },
    });
    const createdOptions = [];
    for (const option of input.options) {
      createdOptions.push(
        await tx.examOption.create({
          data: { questionId: question.id, text: option.text },
        }),
      );
    }
    const correctIndex = input.options.findIndex((option) => option.isCorrect);
    return tx.examQuestion.update({
      where: { id: question.id },
      data: { correctOptionId: createdOptions[correctIndex].id },
      include: { options: true },
    });
  });
};

const getExamForStudent = async (examId: string, userId: string) =>
  prisma.exam.findFirst({
    where: {
      id: examId,
      ...examAvailabilityWhere(),
      course: { enrollments: { some: { userId } }, isDeleted: false, isActive: true },
    },
  });

export const getAllExams = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const now = new Date();
    const where =
      user.role === Role.STUDENT
        ? {
            status: ExamStatus.PUBLISHED,
            course: {
              enrollments: { some: { userId: user.id } },
              isDeleted: false,
              isActive: true,
            },
            AND: [
              { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
              { OR: [{ dueDate: null }, { dueDate: { gt: now } }] },
            ],
          }
        : isPlatformAdmin(user)
          ? { status: { not: ExamStatus.ARCHIVED } }
          : user.role === Role.TEACHER
            ? {
                status: { not: ExamStatus.ARCHIVED },
                OR: [
                  { createdById: user.id },
                  { course: { teachers: { some: { teacherId: user.id } } } },
                ],
              }
            : {
                status: { not: ExamStatus.ARCHIVED },
                course: { assistants: { some: { assistantId: user.id } } },
              };
    const exams = await prisma.exam.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, thumbnailUrl: true } },
        attempts: {
          where: { userId: user.id },
          select: { id: true, status: true, attemptNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch exams." });
  }
};

export const createExam = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      durationMins,
      totalMarks,
      passingMarks,
      isFinalExam,
      courseId,
      availableFrom,
      dueDate,
      maxAttempts,
    } = req.body;
    const duration = positiveInteger(durationMins);
    const declaredTotal = positiveInteger(totalMarks);
    const passing = Number(passingMarks);
    const attempts = positiveInteger(maxAttempts, 1);
    if (!req.user || !String(title || "").trim() || !courseId || !duration || !declaredTotal) {
      return res
        .status(400)
        .json({ error: "Title, course, duration, and total marks are required." });
    }
    if (!Number.isFinite(passing) || passing < 0 || passing > declaredTotal) {
      return res.status(400).json({ error: "Passing marks must be within total marks." });
    }
    if (!(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ error: "You cannot create exams for this course." });
    }
    const starts = optionalDate(availableFrom);
    const ends = optionalDate(dueDate);
    if (starts && ends && ends <= starts) {
      return res.status(400).json({ error: "Due date must follow the availability date." });
    }
    const exam = await prisma.exam.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        durationMins: duration,
        totalMarks: declaredTotal,
        passingMarks: passing,
        isFinalExam: Boolean(isFinalExam),
        courseId,
        createdById: req.user.id,
        status: ExamStatus.DRAFT,
        availableFrom: starts,
        dueDate: ends,
        maxAttempts: Math.min(attempts || 1, 10),
      },
      include: { course: { select: { id: true, title: true } } },
    });
    return res.status(201).json(exam);
  } catch (error) {
    logger.error("Failed to create exam:", error);
    return res.status(500).json({ error: "Failed to create exam." });
  }
};

export const publishExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot publish this exam." });
    }
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true, course: { select: { id: true, title: true } } },
    });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    if (exam.status !== ExamStatus.DRAFT) {
      return res.status(409).json({ error: "Only draft exams can be published." });
    }
    if (!exam.questions.length) {
      return res.status(400).json({ error: "Add at least one question before publishing." });
    }
    const totalMarks = exam.questions.reduce((sum, question) => sum + question.maxMarks, 0);
    if (exam.passingMarks > totalMarks) {
      return res.status(400).json({ error: "Passing marks exceed the question total." });
    }
    const published = await prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.PUBLISHED, totalMarks },
      include: { course: { select: { id: true, title: true } } },
    });
    const students = await prisma.user.findMany({
      where: { enrollments: { some: { courseId: exam.courseId } }, isDeleted: false },
      select: { email: true },
    });
    void Promise.allSettled(students.map((student) => sendExamMail(published, student.email)));
    return res.status(200).json(published);
  } catch (error) {
    logger.error("Failed to publish exam:", error);
    return res.status(500).json({ error: "Failed to publish exam." });
  }
};

export const getExamsByCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!(await canAccessCourse(req.user!, courseId))) {
      return res.status(403).json({ error: "You cannot access this course." });
    }
    const isStaff = req.user!.role !== Role.STUDENT;
    const exams = await prisma.exam.findMany({
      where: {
        courseId,
        ...(isStaff ? { status: { not: ExamStatus.ARCHIVED } } : examAvailabilityWhere()),
      },
      include: {
        attempts: {
          where: { userId: req.user!.id },
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            score: true,
            startedAt: true,
            completedAt: true,
          },
          orderBy: { attemptNumber: "desc" },
        },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(exams);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch exams." });
  }
};

export const getExamById = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const isStaff = await staffCanManageExam(req, examId);
    const exam = isStaff
      ? await prisma.exam.findUnique({
          where: { id: examId },
          include: {
            questions: { include: { options: true }, orderBy: { id: "asc" } },
            course: { select: { id: true, title: true } },
          },
        })
      : await prisma.exam.findFirst({
          where: {
            id: examId,
            ...examAvailabilityWhere(),
            course: { enrollments: { some: { userId: req.user!.id } } },
          },
          include: {
            questions: {
              select: {
                id: true,
                text: true,
                questionType: true,
                maxMarks: true,
                options: { select: { id: true, text: true } },
              },
              orderBy: { id: "asc" },
            },
            course: { select: { id: true, title: true } },
          },
        });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    return res.json(exam);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch exam." });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot update this exam." });
    }
    const current = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { attempts: true } } },
    });
    if (!current) {
      return res.status(404).json({ error: "Exam not found." });
    }
    if (current.status !== ExamStatus.DRAFT || current._count.attempts > 0) {
      return res.status(409).json({ error: "Published or attempted exams cannot be edited." });
    }
    const exam = await prisma.exam.update({
      where: { id: examId },
      data: {
        ...(req.body.title !== undefined ? { title: String(req.body.title).trim() } : {}),
        ...(req.body.description !== undefined
          ? { description: String(req.body.description).trim() || null }
          : {}),
        ...(req.body.durationMins !== undefined
          ? { durationMins: positiveInteger(req.body.durationMins) || current.durationMins }
          : {}),
        ...(req.body.passingMarks !== undefined
          ? { passingMarks: Number(req.body.passingMarks) }
          : {}),
        ...(req.body.isFinalExam !== undefined
          ? { isFinalExam: Boolean(req.body.isFinalExam) }
          : {}),
        ...(req.body.maxAttempts !== undefined
          ? { maxAttempts: Math.min(positiveInteger(req.body.maxAttempts, 1) || 1, 10) }
          : {}),
        ...(req.body.availableFrom !== undefined
          ? { availableFrom: optionalDate(req.body.availableFrom) || null }
          : {}),
        ...(req.body.dueDate !== undefined
          ? { dueDate: optionalDate(req.body.dueDate) || null }
          : {}),
      },
      include: { course: { select: { id: true, title: true } } },
    });
    return res.json(exam);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update exam." });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot archive this exam." });
    }
    await prisma.exam.update({ where: { id: examId }, data: { status: ExamStatus.ARCHIVED } });
    return res.json({ message: "Exam archived." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to archive exam." });
  }
};

export const startExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const userId = req.user!.id;
    const exam = await getExamForStudent(examId, userId);
    if (!exam) {
      return res.status(404).json({ error: "Exam is not currently available." });
    }
    if (!(await canAccessCourse(req.user!, exam.courseId))) {
      return res.status(403).json({ error: "You are not enrolled in this course." });
    }
    const questionCount = await prisma.examQuestion.count({ where: { examId } });
    if (!questionCount) {
      return res.status(400).json({ error: "Exam has no questions." });
    }

    const active = await prisma.examAttempt.findFirst({
      where: { examId, userId, status: ExamAttemptStatus.IN_PROGRESS },
      orderBy: { attemptNumber: "desc" },
    });
    if (active) {
      const expiresAt = new Date(active.startedAt.getTime() + exam.durationMins * 60 * 1000);
      if (expiresAt <= new Date()) {
        await prisma.examAttempt.update({
          where: { id: active.id },
          data: {
            status: ExamAttemptStatus.EXPIRED,
            completedAt: new Date(),
            autoSubmitted: true,
          },
        });
      } else {
        return res.status(200).json({ ...active, expiresAt });
      }
    }
    const attemptCount = await prisma.examAttempt.count({ where: { examId, userId } });
    if (attemptCount >= exam.maxAttempts) {
      return res.status(409).json({ error: "Maximum attempts reached." });
    }
    const attempt = await prisma.examAttempt.create({
      data: {
        examId,
        userId,
        attemptNumber: attemptCount + 1,
        status: ExamAttemptStatus.IN_PROGRESS,
        score: 0,
        answers: {},
      },
      include: { exam: { select: { title: true, durationMins: true } } },
    });
    return res.status(201).json({
      ...attempt,
      expiresAt: new Date(attempt.startedAt.getTime() + exam.durationMins * 60 * 1000),
    });
  } catch (error) {
    logger.error("Failed to start exam:", error);
    return res.status(500).json({ error: "Failed to start exam." });
  }
};

export const submitExam = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const answers = req.body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ error: "Answers object is required." });
    }
    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId: req.user!.id, status: ExamAttemptStatus.IN_PROGRESS },
      include: { exam: { include: { questions: { include: { options: true } } } } },
    });
    if (!attempt) {
      return res.status(404).json({ error: "Active attempt not found." });
    }
    const deadline = attempt.startedAt.getTime() + attempt.exam.durationMins * 60 * 1000;
    if (Date.now() > deadline + 30_000) {
      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: ExamAttemptStatus.EXPIRED,
          completedAt: new Date(),
          autoSubmitted: true,
        },
      });
      return res.status(409).json({ error: "Exam time expired.", expired: true });
    }

    let score = 0;
    let hasSubjective = false;
    const questionResponses = attempt.exam.questions.map((question) => {
      const rawAnswer = (answers as Record<string, unknown>)[question.id];
      if (question.questionType === SUBJECTIVE) {
        hasSubjective = true;
        return {
          questionId: question.id,
          answer: String(rawAnswer || "").trim(),
          marksAwarded: null,
          isCorrect: null,
          evaluationStatus: "PENDING_EVALUATION",
        };
      }
      const selected = question.options.find((option) => option.id === String(rawAnswer || ""));
      const isCorrect = Boolean(selected && selected.id === question.correctOptionId);
      const marksAwarded = isCorrect ? question.maxMarks : 0;
      score += marksAwarded;
      return {
        questionId: question.id,
        answer: selected?.id || null,
        marksAwarded,
        isCorrect,
        evaluationStatus: "AUTO_GRADED",
      };
    });
    const status = hasSubjective
      ? ExamAttemptStatus.PENDING_EVALUATION
      : ExamAttemptStatus.COMPLETED;
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        answers,
        score,
        completedAt: new Date(),
        status,
        evaluationStatus: hasSubjective ? "PENDING_EVALUATION" : "COMPLETED",
        isPassed: hasSubjective ? false : score >= attempt.exam.passingMarks,
        questionResponses: JSON.stringify(questionResponses),
      },
      include: { exam: { select: { title: true, totalMarks: true, passingMarks: true } } },
    });
    return res.json({
      ...updated,
      autoGradedScore: score,
      hasSubjectiveQuestions: hasSubjective,
      message: hasSubjective ? "Exam submitted for evaluation." : "Exam completed and graded.",
    });
  } catch (error) {
    logger.error("Failed to submit exam:", error);
    return res.status(500).json({ error: "Failed to submit exam." });
  }
};

export const cancelExam = async (req: Request, res: Response) => {
  try {
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: req.params.attemptId,
        userId: req.user!.id,
        status: ExamAttemptStatus.IN_PROGRESS,
      },
    });
    if (!attempt) {
      return res.status(404).json({ error: "Active attempt not found." });
    }
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: ExamAttemptStatus.CANCELLED,
        cancelledAt: new Date(),
        completedAt: new Date(),
      },
    });
    return res.status(200).json({ message: "Exam attempt cancelled." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to cancel attempt." });
  }
};

export const getAttemptsByUser = async (req: Request, res: Response) => {
  try {
    const examId = typeof req.query.examId === "string" ? req.query.examId : undefined;
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: req.user!.id, ...(examId ? { examId } : {}) },
      select: {
        id: true,
        examId: true,
        attemptNumber: true,
        status: true,
        score: true,
        startedAt: true,
        completedAt: true,
        isPassed: true,
        evaluationStatus: true,
        exam: {
          select: {
            title: true,
            totalMarks: true,
            passingMarks: true,
            durationMins: true,
            course: { select: { title: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });
    return res.json(
      attempts.map((attempt) => ({
        ...attempt,
        percentage: attempt.exam.totalMarks
          ? Math.round((attempt.score / attempt.exam.totalMarks) * 10_000) / 100
          : 0,
        duration: attempt.completedAt
          ? Math.round((attempt.completedAt.getTime() - attempt.startedAt.getTime()) / 60_000)
          : null,
      })),
    );
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch attempts." });
  }
};

export const getExamStats = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot view these statistics." });
    }
    const attempts = await prisma.examAttempt.findMany({
      where: { examId, status: ExamAttemptStatus.COMPLETED },
      select: { score: true, isPassed: true },
    });
    const passedCount = attempts.filter((attempt) => attempt.isPassed).length;
    const totalAttempts = attempts.length;
    const averageScore = totalAttempts
      ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalAttempts
      : 0;
    return res.json({
      totalAttempts,
      passedCount,
      failedCount: totalAttempts - passedCount,
      passRate: totalAttempts ? Math.round((passedCount / totalAttempts) * 100) : 0,
      averageScore: Math.round(averageScore * 100) / 100,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch exam statistics." });
  }
};

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot edit this exam." });
    }
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { attempts: true } } },
    });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    if (exam.status !== ExamStatus.DRAFT || exam._count.attempts > 0) {
      return res.status(409).json({ error: "Published or attempted exams cannot be edited." });
    }
    const question = await createQuestionRecord(examId, normalizeQuestion(req.body));
    await recalculateExamMarks(examId);
    return res.status(201).json(question);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create question.";
    return res.status(400).json({ error: message });
  }
};

export const getQuestionsByExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const isStaff = await staffCanManageExam(req, examId);
    if (!isStaff) {
      const attempt = await prisma.examAttempt.findFirst({
        where: {
          examId,
          userId: req.user!.id,
          status: ExamAttemptStatus.IN_PROGRESS,
        },
      });
      if (!attempt) {
        return res.status(403).json({ error: "Start the exam before viewing questions." });
      }
    }
    const questions = isStaff
      ? await prisma.examQuestion.findMany({
          where: { examId },
          include: { options: true },
          orderBy: { id: "asc" },
        })
      : await prisma.examQuestion.findMany({
          where: { examId },
          select: {
            id: true,
            text: true,
            questionType: true,
            maxMarks: true,
            options: { select: { id: true, text: true } },
          },
          orderBy: { id: "asc" },
        });
    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch exam questions." });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.examQuestion.findUnique({
      where: { id: req.params.questionId },
      include: { exam: { include: { _count: { select: { attempts: true } } } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "Question not found." });
    }
    if (!(await staffCanManageExam(req, existing.examId))) {
      return res.status(403).json({ error: "You cannot edit this question." });
    }
    if (existing.exam.status !== ExamStatus.DRAFT || existing.exam._count.attempts > 0) {
      return res.status(409).json({ error: "Published or attempted exams cannot be edited." });
    }
    const input = normalizeQuestion({
      ...req.body,
      questionType: req.body.questionType || existing.questionType,
      maxMarks: req.body.maxMarks || existing.maxMarks,
    });
    const question = await prisma.$transaction(async (tx) => {
      await tx.examQuestion.update({
        where: { id: existing.id },
        data: {
          text: input.text,
          questionType: input.questionType,
          maxMarks: input.maxMarks,
          markingScheme: input.markingScheme,
          correctOptionId: null,
        },
      });
      await tx.examOption.deleteMany({ where: { questionId: existing.id } });

      if (input.questionType === OBJECTIVE) {
        const createdOptions = [];
        for (const option of input.options) {
          createdOptions.push(
            await tx.examOption.create({
              data: { questionId: existing.id, text: option.text },
            }),
          );
        }
        const correctIndex = input.options.findIndex((option) => option.isCorrect);
        await tx.examQuestion.update({
          where: { id: existing.id },
          data: { correctOptionId: createdOptions[correctIndex].id },
        });
      }

      return tx.examQuestion.findUnique({
        where: { id: existing.id },
        include: { options: true },
      });
    });
    await recalculateExamMarks(existing.examId);
    return res.json(question);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update question.";
    return res.status(400).json({ error: message });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const question = await prisma.examQuestion.findUnique({
      where: { id: req.params.questionId },
      include: { exam: { include: { _count: { select: { attempts: true } } } } },
    });
    if (!question) {
      return res.status(404).json({ error: "Question not found." });
    }
    if (!(await staffCanManageExam(req, question.examId))) {
      return res.status(403).json({ error: "You cannot delete this question." });
    }
    if (question.exam.status !== ExamStatus.DRAFT || question.exam._count.attempts > 0) {
      return res.status(409).json({ error: "Published or attempted exams cannot be edited." });
    }
    await prisma.$transaction([
      prisma.examOption.deleteMany({ where: { questionId: question.id } }),
      prisma.examQuestion.delete({ where: { id: question.id } }),
    ]);
    await recalculateExamMarks(question.examId);
    return res.json({ message: "Question deleted." });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete question." });
  }
};

export const bulkCreateQuestions = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    if (!(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot edit this exam." });
    }
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { attempts: true } } },
    });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    if (exam.status !== ExamStatus.DRAFT || exam._count.attempts > 0) {
      return res.status(409).json({ error: "Published or attempted exams cannot be edited." });
    }
    const questions: ExamQuestionInput[] = Array.isArray(req.body.questions)
      ? req.body.questions
      : [];
    if (!questions.length || questions.length > 200) {
      return res.status(400).json({ error: "Provide 1 to 200 questions." });
    }
    const created = [];
    for (const question of questions.map(normalizeQuestion)) {
      created.push(await createQuestionRecord(examId, question));
    }
    await recalculateExamMarks(examId);
    return res
      .status(201)
      .json({ message: `Created ${created.length} questions`, questions: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create questions.";
    return res.status(400).json({ error: message });
  }
};

export const getExamAttemptStatus = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const [exam, lastAttempt, attemptsMade] = await Promise.all([
      prisma.exam.findUnique({ where: { id: examId }, select: { maxAttempts: true } }),
      prisma.examAttempt.findFirst({
        where: { examId, userId: req.user!.id },
        orderBy: { attemptNumber: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          startedAt: true,
          completedAt: true,
          isPassed: true,
        },
      }),
      prisma.examAttempt.count({ where: { examId, userId: req.user!.id } }),
    ]);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found." });
    }
    return res.status(200).json({
      hasAttempted: Boolean(lastAttempt),
      status: lastAttempt?.status.toLowerCase() || "not_started",
      canRetake: attemptsMade < exam.maxAttempts,
      attemptsMade,
      maxAttempts: exam.maxAttempts,
      lastAttemptScore: lastAttempt?.score,
      lastAttemptDate: lastAttempt?.startedAt,
      isPassed: lastAttempt?.isPassed,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch attempt status." });
  }
};

const getExamUsersByOutcome = async (req: Request, res: Response, passed: boolean) => {
  const examId = req.params.id;
  if (!(await staffCanManageExam(req, examId))) {
    return res.status(403).json({ error: "You cannot view these results." });
  }
  const users = await prisma.examAttempt.findMany({
    where: { examId, isPassed: passed, status: ExamAttemptStatus.COMPLETED },
    include: { user: { select: basicUserSelect } },
    orderBy: { score: "desc" },
  });
  return res.status(200).json(users);
};

export const getPassedExamsUser = (req: Request, res: Response) =>
  getExamUsersByOutcome(req, res, true);

export const getFailedUsersForExam = (req: Request, res: Response) =>
  getExamUsersByOutcome(req, res, false);

type QuestionResponse = {
  questionId: string;
  answer: unknown;
  marksAwarded: number | null;
  isCorrect: boolean | null;
  evaluationStatus: string;
  feedback?: string;
};

export const evaluateSubjectiveAnswers = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { include: { questions: true } } },
    });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found." });
    }
    if (!(await staffCanManageExam(req, attempt.examId))) {
      return res.status(403).json({ error: "You cannot evaluate this attempt." });
    }
    const evaluations = Array.isArray(req.body.evaluations)
      ? req.body.evaluations
      : Array.isArray(req.body.answers)
        ? req.body.answers.map((answer: any) => ({
            questionId: answer.questionId || answer.id,
            marksAwarded: answer.marksAwarded ?? answer.obtainedMarks,
            feedback: answer.feedback,
          }))
        : [];
    const responses = JSON.parse(attempt.questionResponses || "[]") as QuestionResponse[];
    const questionMap = new Map(attempt.exam.questions.map((question) => [question.id, question]));
    for (const evaluation of evaluations) {
      const questionId = String(evaluation.questionId);
      const question = questionMap.get(questionId);
      const marks = Number(evaluation.marksAwarded);
      const response = responses.find((item) => item.questionId === questionId);
      if (
        !question ||
        question.questionType !== SUBJECTIVE ||
        !response ||
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > question.maxMarks
      ) {
        return res.status(400).json({ error: "One or more evaluations are invalid." });
      }
      response.marksAwarded = marks;
      response.isCorrect = marks === question.maxMarks;
      response.feedback = evaluation.feedback
        ? String(evaluation.feedback).slice(0, 2000)
        : undefined;
      response.evaluationStatus = "EVALUATED";
    }
    const allEvaluated = responses.every(
      (response) => response.evaluationStatus !== "PENDING_EVALUATION",
    );
    const score = responses.reduce((sum, response) => sum + (response.marksAwarded || 0), 0);
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        questionResponses: JSON.stringify(responses),
        evaluationStatus: allEvaluated ? "COMPLETED" : "PENDING_EVALUATION",
        status: allEvaluated ? ExamAttemptStatus.COMPLETED : ExamAttemptStatus.PENDING_EVALUATION,
        isPassed: allEvaluated && score >= attempt.exam.passingMarks,
        evaluatedBy: req.user!.id,
        evaluatedAt: allEvaluated ? new Date() : null,
      },
    });
    return res.json({ success: true, totalScore: score, isComplete: allEvaluated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to evaluate attempt." });
  }
};

export const getPendingEvaluations = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const access = isPlatformAdmin(user)
      ? {}
      : user.role === Role.TEACHER
        ? { exam: { course: { teachers: { some: { teacherId: user.id } } } } }
        : { exam: { course: { assistants: { some: { assistantId: user.id } } } } };
    const pendingAttempts = await prisma.examAttempt.findMany({
      where: { status: ExamAttemptStatus.PENDING_EVALUATION, ...access },
      include: {
        exam: { select: { id: true, title: true } },
        user: { select: basicUserSelect },
      },
      orderBy: { completedAt: "asc" },
    });
    return res.json({ pendingAttempts, count: pendingAttempts.length });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch pending evaluations." });
  }
};

export const createExamRecordingUploadUrl = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { contentType, fileSize } = req.body;
    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId: req.user!.id },
      select: { id: true },
    });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found." });
    }
    if (!UPLOAD.ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return res.status(400).json({ error: "Unsupported recording format." });
    }
    const size = Number(fileSize);
    if (!Number.isFinite(size) || size <= 0 || size > UPLOAD.MAX_DIRECT_VIDEO_SIZE) {
      return res.status(400).json({ error: "Invalid recording size." });
    }
    const key = `exam-recordings/${attemptId}/${req.user!.id}/${crypto.randomUUID()}.webm`;
    const uploadUrl = await generatePresignedUploadUrl(key, contentType);
    const uploadToken = createUploadReceipt({
      key,
      ownerId: req.user!.id,
      purpose: `exam-recording:${attemptId}`,
      contentType,
      size,
    });
    return res.json({
      uploadUrl,
      key,
      uploadToken,
      headers: {
        "Content-Type": contentType,
        ...(USE_AZURE_STORAGE ? { "x-ms-blob-type": "BlockBlob" } : {}),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to prepare recording upload." });
  }
};

export const completeExamRecordingUpload = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { key, uploadToken } = req.body;
    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId: req.user!.id },
    });
    const expectedPrefix = `exam-recordings/${attemptId}/${req.user!.id}/`;
    if (!attempt || typeof key !== "string" || !key.startsWith(expectedPrefix)) {
      return res.status(400).json({ error: "Invalid attempt or recording key." });
    }
    const receipt = verifyUploadReceipt(uploadToken, {
      key,
      ownerId: req.user!.id,
      purpose: `exam-recording:${attemptId}`,
    });
    if (!receipt) {
      return res.status(400).json({ error: "Recording upload receipt is invalid or expired." });
    }
    const metadata = await privateObjectMetadata(key).catch(() => null);
    if (!metadata) {
      return res.status(409).json({ error: "Recording upload is not complete." });
    }
    if (!uploadMatchesReceipt(receipt, metadata)) {
      await deletePrivateObject(key).catch(() => undefined);
      return res.status(409).json({ error: "Recording does not match the approved upload." });
    }
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { videoRecordingKey: key, videoUrl: privateObjectReference(key) },
    });
    return res.json({ message: "Recording saved.", attempt: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save recording." });
  }
};

export const uploadExamRecording = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "No recording uploaded." });
    }
    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId: req.user!.id },
    });
    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found." });
    }
    const key = `exam-recordings/${attemptId}/${req.user!.id}/${crypto.randomUUID()}.webm`;
    const videoUrl = await uploadPrivateFileToS3(req.file.buffer, req.file.mimetype, key);
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { videoRecordingKey: key, videoUrl },
    });
    return res.json({ message: "Recording uploaded.", attempt: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to upload recording." });
  }
};

export const getMyExamAttempts = async (req: Request, res: Response) => {
  try {
    const attempts = await prisma.examAttempt.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        examId: true,
        attemptNumber: true,
        status: true,
        score: true,
        completedAt: true,
        isPassed: true,
      },
      orderBy: { startedAt: "desc" },
    });
    return res.json(attempts);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch attempts." });
  }
};

export const sendBulkExamResults = async (req: Request, res: Response) => {
  try {
    const examId = String(req.body.examId || "");
    if (!examId || !(await staffCanManageExam(req, examId))) {
      return res.status(403).json({ error: "You cannot send these results." });
    }
    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId,
        status: ExamAttemptStatus.COMPLETED,
        resultsSentAt: null,
      },
      include: {
        exam: { select: { title: true, totalMarks: true } },
        user: { select: { email: true, name: true } },
      },
    });
    const sent: string[] = [];
    const failed: string[] = [];
    for (const attempt of attempts) {
      try {
        await sendExamResultEmail(
          attempt.user.email,
          attempt.user.name,
          attempt.exam.title,
          attempt.score,
          attempt.exam.totalMarks,
          attempt.isPassed,
        );
        await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: { resultsSentAt: new Date() },
        });
        sent.push(attempt.id);
      } catch {
        failed.push(attempt.id);
      }
    }
    return res.status(200).json({ message: "Exam result delivery completed.", sent, failed });
  } catch (error) {
    return res.status(500).json({ error: "Failed to send exam results." });
  }
};

export const getExamAttemptById = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: { include: { questions: { include: { options: true } } } },
        user: { select: basicUserSelect },
      },
    });
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found." });
    }
    const canManage = await staffCanManageExam(req, attempt.examId);
    if (attempt.userId !== req.user!.id && !canManage) {
      return res.status(403).json({ message: "You cannot view this attempt." });
    }

    if (!canManage) {
      const { questions: _questions, ...safeExam } = attempt.exam;
      return res.status(200).json({
        id: attempt.id,
        score: attempt.score,
        status: attempt.status,
        isPassed: attempt.isPassed,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        evaluationStatus: attempt.evaluationStatus,
        exam: safeExam,
      });
    }

    const responses = JSON.parse(attempt.questionResponses || "[]") as QuestionResponse[];
    return res.status(200).json({
      id: attempt.id,
      score: attempt.score,
      status: attempt.status,
      evaluationStatus: attempt.evaluationStatus,
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        totalMarks: attempt.exam.totalMarks,
        passingMarks: attempt.exam.passingMarks,
      },
      user: attempt.user,
      questions: attempt.exam.questions.map((question) => ({
        id: question.id,
        text: question.text,
        questionType: question.questionType,
        maxMarks: question.maxMarks,
        marks: question.maxMarks,
        markingScheme: question.markingScheme,
        options: question.options.map((option) => ({
          ...option,
          isCorrect: option.id === question.correctOptionId,
        })),
      })),
      answers: responses.map((response) => ({
        id: response.questionId,
        questionId: response.questionId,
        answerText: typeof response.answer === "string" ? response.answer : "",
        selectedOptionId: typeof response.answer === "string" ? response.answer : undefined,
        obtainedMarks: response.marksAwarded,
        feedback: response.feedback,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch attempt." });
  }
};

export const getExamRecordingPresignedUrl = async (req: Request, res: Response) => {
  try {
    const key = typeof req.query.key === "string" ? req.query.key : "";
    if (!key) {
      return res.status(400).json({ error: "Recording key is required." });
    }
    const attempt = await prisma.examAttempt.findFirst({
      where: { videoRecordingKey: key },
      select: { examId: true, userId: true },
    });
    if (!attempt) {
      return res.status(404).json({ error: "Recording not found." });
    }
    if (attempt.userId !== req.user!.id && !(await staffCanManageExam(req, attempt.examId))) {
      return res.status(403).json({ error: "You cannot view this recording." });
    }
    return res.json({ presignedUrl: await generatePresignedViewUrl(key) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate recording URL." });
  }
};

export const getAllExamScores = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const access = isPlatformAdmin(user)
      ? {}
      : user.role === Role.TEACHER
        ? { exam: { course: { teachers: { some: { teacherId: user.id } } } } }
        : { exam: { course: { assistants: { some: { assistantId: user.id } } } } };
    const scores = await prisma.examAttempt.findMany({
      where: access,
      select: {
        id: true,
        examId: true,
        userId: true,
        score: true,
        isPassed: true,
        completedAt: true,
        exam: { select: { id: true, title: true, totalMarks: true } },
        user: { select: basicUserSelect },
      },
      orderBy: { completedAt: "desc" },
    });
    return res.json({ total: scores.length, scores });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch exam scores." });
  }
};
