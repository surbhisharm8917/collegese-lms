import { Request, Response } from "express";
import {
  AnswerRevealPolicy,
  NotificationType,
  QuestionType,
  QuizStatus,
  Role,
  SubmissionStatus,
} from "@generated/prisma/client";
import prisma from "../../config/db";
import {
  canAccessCourse,
  canManageCourse,
  canManageQuiz,
  isPlatformAdmin,
} from "../../services/access.service";
import { NotificationService } from "../../services/notification.service";
import { basicUserSelect } from "../../utils/user.select";
import { logger } from "../../utils/logger";

const parseOptionalDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parsePositiveInteger = (value: unknown, fallback?: number): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const recalculateQuizMarks = async (quizId: string) => {
  const aggregate = await prisma.question.aggregate({
    where: { quizId },
    _sum: { marks: true },
  });
  await prisma.quiz.update({
    where: { id: quizId },
    data: { totalMarks: aggregate._sum.marks || 0 },
  });
};

type QuestionInput = {
  text?: unknown;
  type?: unknown;
  marks?: unknown;
  options?: unknown;
  tags?: unknown;
};

const normalizeQuestionInput = (input: QuestionInput) => {
  const text = String(input.text || "").trim();
  const type = Object.values(QuestionType).includes(input.type as QuestionType)
    ? (input.type as QuestionType)
    : QuestionType.MCQ;
  const marks = parsePositiveInteger(input.marks, 1);
  const tags = Array.isArray(input.tags)
    ? input.tags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (!text || !marks || marks > 100) {
    throw new Error("Question text and marks from 1 to 100 are required.");
  }

  const rawOptions = Array.isArray(input.options) ? input.options : [];
  const options = rawOptions.map((option: any) => ({
    text: String(option.text || "").trim(),
    isCorrect: option.isCorrect === true,
  }));
  if (type !== QuestionType.SUBJECTIVE) {
    if (options.length < 2 || options.some((option) => !option.text)) {
      throw new Error("Objective questions require at least two non-empty options.");
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      throw new Error("Objective questions require exactly one correct option.");
    }
  }

  return { text, type, marks, tags, options };
};

const assertQuizAccess = async (req: Request, quizId: string): Promise<boolean> =>
  Boolean(req.user && (await canManageQuiz(req.user, quizId)));

export const createQuizController = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      courseId,
      timeLimit,
      availableFrom,
      dueDate,
      maxAttempts,
      answerRevealPolicy,
      negativeMarkingValue,
    } = req.body;
    if (!req.user || !String(title || "").trim() || !courseId) {
      return res.status(400).json({ success: false, message: "Title and course are required." });
    }
    if (!(await canManageCourse(req.user, courseId))) {
      return res.status(403).json({ success: false, message: "You cannot create quizzes here." });
    }

    const parsedTimeLimit = parsePositiveInteger(timeLimit);
    const parsedAttempts = parsePositiveInteger(maxAttempts, 1);
    const parsedAvailableFrom = parseOptionalDate(availableFrom);
    const parsedDueDate = parseOptionalDate(dueDate);
    if ((timeLimit && !parsedTimeLimit) || (maxAttempts && !parsedAttempts)) {
      return res
        .status(400)
        .json({ success: false, message: "Time and attempts must be positive." });
    }
    if (parsedAvailableFrom && parsedDueDate && parsedDueDate <= parsedAvailableFrom) {
      return res
        .status(400)
        .json({ success: false, message: "Due date must follow availability." });
    }
    const revealPolicy = Object.values(AnswerRevealPolicy).includes(answerRevealPolicy)
      ? answerRevealPolicy
      : AnswerRevealPolicy.IMMEDIATE_SCORE_ONLY;
    if (revealPolicy === AnswerRevealPolicy.AFTER_DEADLINE && !parsedDueDate) {
      return res.status(400).json({
        success: false,
        message: "A due date is required when answers are revealed after the deadline.",
      });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        timeLimit: parsedTimeLimit,
        maxAttempts: Math.min(parsedAttempts || 1, 10),
        availableFrom: parsedAvailableFrom,
        dueDate: parsedDueDate,
        answerRevealPolicy: revealPolicy,
        negativeMarkingValue:
          Number(negativeMarkingValue) > 0 ? Number(negativeMarkingValue) : undefined,
        courseId,
        createdById: req.user.id,
        status: QuizStatus.DRAFT,
      },
      include: {
        createdBy: { select: basicUserSelect },
        course: { select: { id: true, title: true } },
      },
    });
    return res.status(201).json({ success: true, message: "Quiz created successfully.", quiz });
  } catch (error) {
    logger.error("Failed to create quiz:", error);
    return res.status(500).json({ success: false, message: "Failed to create quiz." });
  }
};

export const addQuestionToQuizController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res.status(403).json({ success: false, message: "You cannot edit this quiz." });
    }
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { status: true } });
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    if (quiz.status !== QuizStatus.DRAFT) {
      return res
        .status(409)
        .json({ success: false, message: "Published quizzes cannot be edited." });
    }

    const input = normalizeQuestionInput(req.body);
    const question = await prisma.question.create({
      data: {
        text: input.text,
        type: input.type,
        marks: input.marks,
        tags: input.tags,
        quizId,
        ...(input.type !== QuestionType.SUBJECTIVE ? { options: { create: input.options } } : {}),
      },
      include: { options: true },
    });
    await recalculateQuizMarks(quizId);
    return res.status(201).json({ success: true, message: "Question added.", question });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add question.";
    return res.status(400).json({ success: false, message });
  }
};

export const publishQuizController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res.status(403).json({ success: false, message: "You cannot publish this quiz." });
    }
    const current = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } },
    });
    if (!current) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    if (current.status !== QuizStatus.DRAFT) {
      return res
        .status(409)
        .json({ success: false, message: "Only draft quizzes can be published." });
    }
    if (current.questions.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one question first." });
    }
    const invalidObjective = current.questions.some(
      (question) =>
        question.type !== QuestionType.SUBJECTIVE &&
        question.options.filter((option) => option.isCorrect).length !== 1,
    );
    if (invalidObjective) {
      return res
        .status(400)
        .json({ success: false, message: "Every objective question needs one correct answer." });
    }

    const totalMarks = current.questions.reduce((sum, question) => sum + question.marks, 0);
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.PUBLISHED, totalMarks },
      include: { course: { select: { id: true, title: true } } },
    });
    if (quiz.courseId) {
      await NotificationService.notifyAllCourseStakeholders(
        quiz.courseId,
        NotificationType.QUIZ_PUBLISHED,
        "New Quiz Available",
        `A new quiz "${quiz.title}" has been published.`,
        { quizId: quiz.id, courseId: quiz.courseId },
        { notifyStudents: true, notifyTeachers: true, notifyAssistants: true },
      );
    }
    return res.status(200).json({ success: true, message: "Quiz published.", quiz });
  } catch (error) {
    logger.error("Failed to publish quiz:", error);
    return res.status(500).json({ success: false, message: "Failed to publish quiz." });
  }
};

export const updateQuizController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res.status(403).json({ success: false, message: "You cannot update this quiz." });
    }
    const current = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!current) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    if (current.status !== QuizStatus.DRAFT) {
      return res
        .status(409)
        .json({ success: false, message: "Published quizzes cannot be edited." });
    }
    if (req.body.courseId && !(await canManageCourse(req.user!, req.body.courseId))) {
      return res.status(403).json({ success: false, message: "You cannot move this quiz there." });
    }

    const availableFrom = parseOptionalDate(req.body.availableFrom);
    const dueDate = parseOptionalDate(req.body.dueDate);
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(req.body.title !== undefined ? { title: String(req.body.title).trim() } : {}),
        ...(req.body.description !== undefined
          ? { description: String(req.body.description).trim() || null }
          : {}),
        ...(req.body.courseId ? { courseId: req.body.courseId } : {}),
        ...(req.body.timeLimit !== undefined
          ? { timeLimit: parsePositiveInteger(req.body.timeLimit) || null }
          : {}),
        ...(req.body.maxAttempts !== undefined
          ? { maxAttempts: Math.min(parsePositiveInteger(req.body.maxAttempts, 1) || 1, 10) }
          : {}),
        ...(req.body.availableFrom !== undefined ? { availableFrom: availableFrom || null } : {}),
        ...(req.body.dueDate !== undefined ? { dueDate: dueDate || null } : {}),
      },
      include: { createdBy: { select: basicUserSelect } },
    });
    return res.status(200).json({ success: true, message: "Quiz updated.", quiz });
  } catch (error) {
    logger.error("Failed to update quiz:", error);
    return res.status(500).json({ success: false, message: "Failed to update quiz." });
  }
};

export const deleteQuizController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res.status(403).json({ success: false, message: "You cannot archive this quiz." });
    }
    await prisma.quiz.update({
      where: { id: quizId },
      data: { status: QuizStatus.ARCHIVED, isLatest: false },
    });
    return res.status(200).json({ success: true, message: "Quiz archived." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to archive quiz." });
  }
};

export const getQuizSubmissionsController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot view these submissions." });
    }
    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId },
      include: { user: { select: basicUserSelect } },
      orderBy: [{ submittedAt: "desc" }, { startTime: "desc" }],
    });
    return res.status(200).json({ success: true, submissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch submissions." });
  }
};

export const gradeSubmissionController = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const submission = await prisma.quizSubmission.findUnique({
      where: { id: submissionId },
      include: {
        responses: { include: { question: true } },
        quiz: { select: { id: true, title: true } },
      },
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }
    if (!(await assertQuizAccess(req, submission.quizId))) {
      return res.status(403).json({ success: false, message: "You cannot grade this submission." });
    }
    const grades = Array.isArray(req.body.gradedResponses) ? req.body.gradedResponses : [];
    const responseMap = new Map(submission.responses.map((response) => [response.id, response]));
    const updates = grades.map((grade: any) => {
      const response = responseMap.get(String(grade.responseId));
      const marks = Number(grade.marksAwarded);
      if (
        !response ||
        response.question.type !== QuestionType.SUBJECTIVE ||
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > response.question.marks
      ) {
        throw new Error("One or more subjective grades are invalid.");
      }
      return prisma.quizResponse.update({
        where: { id: response.id },
        data: { marksAwarded: marks, isCorrect: marks === response.question.marks },
      });
    });
    await prisma.$transaction(updates);

    const responses = await prisma.quizResponse.findMany({
      where: { submissionId },
      include: { question: { select: { marks: true } } },
    });
    const score = responses.reduce(
      (sum, response) =>
        sum + (response.marksAwarded ?? (response.isCorrect ? response.question.marks : 0)),
      0,
    );
    const updated = await prisma.quizSubmission.update({
      where: { id: submissionId },
      data: { score, status: SubmissionStatus.COMPLETED },
      include: { quiz: { select: { id: true, title: true } }, user: { select: basicUserSelect } },
    });
    await NotificationService.createNotification({
      type: NotificationType.QUIZ_GRADED,
      title: "Quiz Graded",
      message: `Your submission for "${submission.quiz.title}" has been graded. Score: ${score}`,
      recipientId: submission.userId,
      metadata: { quizId: submission.quizId, submissionId, score },
    });
    return res
      .status(200)
      .json({ success: true, message: "Submission graded.", submission: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to grade submission.";
    return res.status(400).json({ success: false, message });
  }
};

const availableQuizWhere = (courseIds: string[]) => {
  const now = new Date();
  return {
    courseId: { in: courseIds },
    status: QuizStatus.PUBLISHED,
    isLatest: true,
    AND: [
      { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
      { OR: [{ dueDate: null }, { dueDate: { gt: now } }] },
    ],
  };
};

export const getAvailableQuizzesController = async (req: Request, res: Response) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: req.user!.id, course: { isDeleted: false, isActive: true } },
      select: { courseId: true },
    });
    const courseIds = enrollments
      .map((entry) => entry.courseId)
      .filter((id): id is string => Boolean(id));
    const quizzes = await prisma.quiz.findMany({
      where: availableQuizWhere(courseIds),
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        totalMarks: true,
        maxAttempts: true,
        dueDate: true,
        course: { select: { id: true, title: true } },
        submissions: {
          where: { userId: req.user!.id },
          select: { id: true, status: true, attemptNumber: true, score: true },
          orderBy: { attemptNumber: "desc" },
        },
      },
    });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quizzes." });
  }
};

export const startQuizAttemptController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.user!.id;
    const now = new Date();
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        status: QuizStatus.PUBLISHED,
        isLatest: true,
        AND: [
          { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
          { OR: [{ dueDate: null }, { dueDate: { gt: now } }] },
        ],
      },
      select: { courseId: true, timeLimit: true, maxAttempts: true },
    });
    if (!quiz?.courseId) {
      return res.status(404).json({ success: false, message: "Quiz is not currently available." });
    }
    if (!(await canAccessCourse(req.user!, quiz.courseId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not enrolled in this course." });
    }
    const existingActive = await prisma.quizSubmission.findFirst({
      where: { userId, quizId, status: SubmissionStatus.IN_PROGRESS },
      orderBy: { attemptNumber: "desc" },
    });
    if (existingActive) {
      return res.status(200).json({
        success: true,
        message: "Continuing active quiz.",
        submissionId: existingActive.id,
        timeLimit: quiz.timeLimit,
      });
    }
    const attemptCount = await prisma.quizSubmission.count({ where: { userId, quizId } });
    if (attemptCount >= quiz.maxAttempts) {
      return res.status(409).json({ success: false, message: "Maximum attempts reached." });
    }
    const submission = await prisma.quizSubmission.create({
      data: {
        userId,
        quizId,
        attemptNumber: attemptCount + 1,
        status: SubmissionStatus.IN_PROGRESS,
        submittedAt: null,
      },
    });
    return res.status(201).json({
      success: true,
      message: "Quiz started.",
      submissionId: submission.id,
      timeLimit: quiz.timeLimit,
    });
  } catch (error) {
    logger.error("Failed to start quiz:", error);
    return res.status(500).json({ success: false, message: "Failed to start quiz." });
  }
};

export const getQuizAttemptQuestionsController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const submission = await prisma.quizSubmission.findFirst({
      where: { quizId, userId: req.user!.id, status: SubmissionStatus.IN_PROGRESS },
      orderBy: { attemptNumber: "desc" },
      include: {
        quiz: {
          select: {
            timeLimit: true,
            questions: {
              where: { isLatest: true },
              select: {
                id: true,
                text: true,
                type: true,
                marks: true,
                options: { select: { id: true, text: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
    if (!submission) {
      return res
        .status(403)
        .json({ success: false, message: "Start the quiz before viewing questions." });
    }
    const elapsedSeconds = Math.floor((Date.now() - submission.startTime.getTime()) / 1000);
    const timeRemainingSeconds = submission.quiz.timeLimit
      ? Math.max(0, submission.quiz.timeLimit * 60 - elapsedSeconds)
      : null;
    return res.status(200).json({
      success: true,
      submissionId: submission.id,
      questions: submission.quiz.questions,
      timeRemainingSeconds,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quiz questions." });
  }
};

export const submitQuizAttemptController = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const submission = await prisma.quizSubmission.findFirst({
      where: { id: submissionId, userId: req.user!.id, status: SubmissionStatus.IN_PROGRESS },
      include: { quiz: { include: { questions: { include: { options: true } } } } },
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: "Active submission not found." });
    }
    const answerMap = new Map(answers.map((answer: any) => [String(answer.questionId), answer]));
    let score = 0;
    let hasSubjective = false;
    const responses = submission.quiz.questions.map((question) => {
      const answer: any = answerMap.get(question.id);
      if (question.type === QuestionType.SUBJECTIVE) {
        hasSubjective = true;
        const writtenAnswer = String(
          answer?.writtenAnswer ?? answer?.selectedOptionId ?? "",
        ).trim();
        return {
          submissionId,
          questionId: question.id,
          writtenAnswer: writtenAnswer || null,
          answeredAt: writtenAnswer ? new Date() : null,
          isCorrect: null,
          marksAwarded: null,
        };
      }

      const selectedOption = question.options.find(
        (option) => option.id === String(answer?.selectedOptionId || ""),
      );
      const isCorrect = selectedOption ? selectedOption.isCorrect : false;
      let marksAwarded = 0;
      if (isCorrect) {
        marksAwarded = question.marks;
      } else if (selectedOption && submission.quiz.negativeMarkingValue) {
        marksAwarded = -Math.min(submission.quiz.negativeMarkingValue, question.marks);
      }
      score += marksAwarded;
      return {
        submissionId,
        questionId: question.id,
        selectedOptionId: selectedOption?.id || null,
        answeredAt: selectedOption ? new Date() : null,
        isCorrect,
        marksAwarded,
      };
    });

    const status = hasSubjective ? SubmissionStatus.PENDING_REVIEW : SubmissionStatus.COMPLETED;
    await prisma.$transaction([
      prisma.quizResponse.createMany({ data: responses }),
      prisma.quizSubmission.update({
        where: { id: submissionId },
        data: {
          status,
          score,
          endTime: new Date(),
          submittedAt: new Date(),
        },
      }),
    ]);
    if (submission.quiz.courseId) {
      await NotificationService.notifyAllCourseStakeholders(
        submission.quiz.courseId,
        NotificationType.QUIZ_SUBMITTED,
        hasSubjective ? "Quiz Submission Needs Grading" : "Quiz Submitted",
        `A learner submitted "${submission.quiz.title}".`,
        { quizId: submission.quiz.id, submissionId, studentId: submission.userId },
        { notifyStudents: false, notifyTeachers: true, notifyAssistants: true },
      );
    }
    return res.status(200).json({ success: true, message: "Quiz submitted.", status, score });
  } catch (error) {
    logger.error("Failed to submit quiz:", error);
    return res.status(500).json({ success: false, message: "Failed to submit quiz." });
  }
};

export const getMySubmissionResultController = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const submission = await prisma.quizSubmission.findFirst({
      where: { id: submissionId, userId: req.user!.id },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            answerRevealPolicy: true,
            dueDate: true,
          },
        },
      },
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    const mayRevealAnswers =
      submission.quiz.answerRevealPolicy === AnswerRevealPolicy.AFTER_DEADLINE &&
      Boolean(submission.quiz.dueDate && submission.quiz.dueDate <= new Date());
    let responseDetails: unknown[] | null = null;
    if (mayRevealAnswers) {
      const responses = await prisma.quizResponse.findMany({
        where: { submissionId },
        include: {
          selectedOption: { select: { text: true } },
          question: {
            include: { options: { where: { isCorrect: true }, select: { text: true } } },
          },
        },
      });
      responseDetails = responses.map((response) => ({
        questionText: response.question.text,
        yourAnswer: response.selectedOption?.text || response.writtenAnswer || "Not answered",
        correctAnswer:
          response.question.type === QuestionType.SUBJECTIVE
            ? "Manually graded"
            : response.question.options[0]?.text || "Not available",
        isCorrect: response.isCorrect,
        marksAwarded: response.marksAwarded,
      }));
    }
    return res.status(200).json({
      success: true,
      result: {
        quizTitle: submission.quiz.title,
        totalMarks: submission.quiz.totalMarks || 0,
        status: submission.status,
        score: submission.score,
        responses: responseDetails,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch result." });
  }
};

export const getQuizAnalyticsController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot view this analytics report." });
    }
    const submissions = await prisma.quizSubmission.findMany({
      where: { quizId, status: SubmissionStatus.COMPLETED },
      include: {
        responses: { include: { question: { select: { id: true, text: true } } } },
        user: { select: { department: true } },
      },
    });
    const perQuestion = new Map<string, { text: string; total: number; incorrect: number }>();
    const perCohort = new Map<string, { score: number; count: number }>();
    for (const submission of submissions) {
      for (const response of submission.responses) {
        const entry = perQuestion.get(response.questionId) || {
          text: response.question.text,
          total: 0,
          incorrect: 0,
        };
        entry.total += 1;
        if (response.isCorrect === false) {
          entry.incorrect += 1;
        }
        perQuestion.set(response.questionId, entry);
      }
      const cohort = submission.user.department || "Unknown";
      const entry = perCohort.get(cohort) || { score: 0, count: 0 };
      entry.score += submission.score || 0;
      entry.count += 1;
      perCohort.set(cohort, entry);
    }
    return res.status(200).json({
      success: true,
      analytics: {
        questionDifficulty: Array.from(perQuestion, ([questionId, entry]) => ({
          questionId,
          questionText: entry.text,
          difficulty: entry.total ? (entry.incorrect / entry.total) * 100 : 0,
        })),
        cohortPerformance: Array.from(perCohort, ([cohort, entry]) => ({
          cohort,
          averageScore: entry.count ? entry.score / entry.count : 0,
          numberOfStudents: entry.count,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate analytics." });
  }
};

export const getQuizController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, status: QuizStatus.PUBLISHED, isLatest: true },
      select: {
        id: true,
        title: true,
        description: true,
        courseId: true,
        timeLimit: true,
        totalMarks: true,
        dueDate: true,
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            marks: true,
            options: { select: { id: true, text: true } },
          },
        },
      },
    });
    if (!quiz?.courseId || !(await canAccessCourse(req.user!, quiz.courseId))) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    return res.status(200).json({ success: true, quiz });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quiz." });
  }
};

export const getQuizzesController = getAvailableQuizzesController;

export const getAllQuizzesForAuditController = async (_req: Request, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: basicUserSelect },
        course: { select: { id: true, title: true } },
      },
    });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quizzes." });
  }
};

export const getQuizzesForTeacherController = async (req: Request, res: Response) => {
  try {
    const where = isPlatformAdmin(req.user!)
      ? { status: { not: QuizStatus.ARCHIVED } }
      : {
          status: { not: QuizStatus.ARCHIVED },
          OR: [
            { createdById: req.user!.id },
            { course: { teachers: { some: { teacherId: req.user!.id } } } },
          ],
        };
    const quizzes = await prisma.quiz.findMany({
      where,
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quizzes." });
  }
};

export const getQuizDetailsForAdminController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res.status(403).json({ success: false, message: "You cannot view this quiz." });
    }
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: basicUserSelect },
        questions: { orderBy: { createdAt: "asc" }, include: { options: true } },
      },
    });
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    return res.status(200).json({ success: true, quiz });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quiz." });
  }
};

export const addBulkQuestionsController = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    if (!(await assertQuizAccess(req, quizId))) {
      return res.status(403).json({ success: false, message: "You cannot edit this quiz." });
    }
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { status: true } });
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }
    if (quiz.status !== QuizStatus.DRAFT) {
      return res
        .status(409)
        .json({ success: false, message: "Published quizzes cannot be edited." });
    }
    const questions: QuestionInput[] = Array.isArray(req.body.questions) ? req.body.questions : [];
    if (!questions.length || questions.length > 200) {
      return res.status(400).json({ success: false, message: "Provide 1 to 200 questions." });
    }
    const normalized = questions.map(normalizeQuestionInput);
    await prisma.$transaction(
      normalized.map((question) =>
        prisma.question.create({
          data: {
            quizId,
            text: question.text,
            type: question.type,
            marks: question.marks,
            tags: question.tags,
            ...(question.type !== QuestionType.SUBJECTIVE
              ? { options: { create: question.options } }
              : {}),
          },
        }),
      ),
    );
    await recalculateQuizMarks(quizId);
    return res
      .status(201)
      .json({ success: true, message: `${normalized.length} questions added.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add questions.";
    return res.status(400).json({ success: false, message });
  }
};

export const getQuizzesByCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!(await canAccessCourse(req.user!, courseId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not enrolled in this course." });
    }
    const quizzes = await prisma.quiz.findMany({
      where: availableQuizWhere([courseId]),
      select: {
        id: true,
        title: true,
        description: true,
        timeLimit: true,
        totalMarks: true,
        maxAttempts: true,
        dueDate: true,
      },
    });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quizzes." });
  }
};

export const getQuizzesForAssistantController = async (req: Request, res: Response) => {
  try {
    const where =
      isPlatformAdmin(req.user!) || req.user!.role === Role.TEACHER
        ? { status: { not: QuizStatus.ARCHIVED }, isLatest: true }
        : {
            status: { not: QuizStatus.ARCHIVED },
            isLatest: true,
            course: { assistants: { some: { assistantId: req.user!.id } } },
          };
    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: basicUserSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch quizzes." });
  }
};
