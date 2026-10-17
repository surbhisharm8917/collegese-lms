import crypto from "crypto";
import { GradeStatus, Role, SubmissionType } from "@generated/prisma/client";
import { Request, Response } from "express";
import prisma from "../../config/db";
import {
  canAccessCourse,
  canGradeAssessment,
  canManageAssessment,
  canManageCourse,
  isPlatformAdmin,
} from "../../services/access.service";
import { sendAssessmentEmail } from "../../services/email.service";
import { NotificationService } from "../../services/notification.service";
import {
  generatePresignedUploadUrl,
  generatePresignedViewUrl,
  privateObjectMetadata,
  privateObjectReference,
  deletePrivateObject,
  USE_AZURE_STORAGE,
} from "../../utils/s3.utils";
import { azureExtractKey } from "../../utils/azureBlob.utils";
import { extractKeyFromUrl } from "../../utils/localStorage.utils";
import { basicUserSelect } from "../../utils/user.select";
import { logger } from "../../utils/logger";
import { UPLOAD } from "../../utils/constants";
import {
  createUploadReceipt,
  uploadMatchesReceipt,
  verifyUploadReceipt,
} from "../../utils/uploadReceipt";

const assessmentInclude = {
  course: { select: { id: true, title: true } },
  createdBy: { select: basicUserSelect },
  questions: { select: { id: true, text: true, marks: true } },
  assignedAssistants: {
    select: { assistant: { select: basicUserSelect } },
  },
};

const parseQuestions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((question) => {
    const text = String(question.text || "").trim();
    const marks = Number(question.marks);
    if (!text || !Number.isInteger(marks) || marks <= 0 || marks > 100) {
      throw new Error("Every question needs text and marks from 1 to 100.");
    }
    return { text, marks };
  });
};

const extractPrivateKey = (url: string) =>
  USE_AZURE_STORAGE ? azureExtractKey(url) : extractKeyFromUrl(url);

export const createAssessmentController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, description, dueDate, totalMarks, submissionType, questions } = req.body;
    if (!req.user || !(await canManageCourse(req.user, courseId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot create assessments here." });
    }
    const parsedTitle = String(title || "").trim();
    const parsedMarks = Number(totalMarks ?? 100);
    const parsedQuestions = parseQuestions(questions);
    const parsedDueDate = dueDate ? new Date(dueDate) : undefined;
    if (!parsedTitle || !Number.isInteger(parsedMarks) || parsedMarks <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Title and valid total marks are required." });
    }
    if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid due date." });
    }
    if (parsedQuestions.reduce((sum, question) => sum + question.marks, 0) > parsedMarks) {
      return res
        .status(400)
        .json({ success: false, message: "Question marks exceed total marks." });
    }
    const parsedSubmissionType = Object.values(SubmissionType).includes(submissionType)
      ? submissionType
      : SubmissionType.FILE_UPLOAD;

    const assessment = await prisma.assessment.create({
      data: {
        courseId,
        title: parsedTitle,
        description: description ? String(description).trim() : undefined,
        dueDate: parsedDueDate,
        totalMarks: parsedMarks,
        submissionType: parsedSubmissionType,
        createdById: req.user.id,
        questions: { create: parsedQuestions },
      },
      include: assessmentInclude,
    });
    await NotificationService.notifyAllCourseStakeholders(
      courseId,
      "ASSESSMENT_PUBLISHED",
      "New Assessment Available",
      `A new assessment "${assessment.title}" has been published.`,
      { assessmentId: assessment.id, courseId },
      { notifyStudents: true, notifyTeachers: true, notifyAssistants: true },
    );
    const students = await prisma.user.findMany({
      where: { enrollments: { some: { courseId } }, isDeleted: false },
      select: { email: true, name: true },
    });
    void Promise.allSettled(
      students.map((student) =>
        sendAssessmentEmail(student.email, student.name || "Learner", assessment),
      ),
    );
    return res.status(201).json({ success: true, assessment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create assessment.";
    return res.status(400).json({ success: false, message });
  }
};

export const submitAssessmentController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const studentId = req.user!.id;
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, isDeleted: false },
      include: {
        course: { select: { id: true } },
        createdBy: { select: { id: true } },
        assignedAssistants: { select: { assistantId: true } },
      },
    });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found." });
    }
    if (!(await canAccessCourse(req.user!, assessment.courseId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not enrolled in this course." });
    }
    if (assessment.dueDate && assessment.dueDate < new Date()) {
      return res
        .status(409)
        .json({ success: false, message: "The assessment deadline has passed." });
    }
    const previous = await prisma.assessmentSubmission.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId } },
    });
    if (previous?.status === GradeStatus.GRADED) {
      return res
        .status(409)
        .json({ success: false, message: "A graded submission cannot be replaced." });
    }

    let fileUrl: string | null = null;
    let textContent: string | null = null;
    if (assessment.submissionType === SubmissionType.FILE_UPLOAD) {
      const key = String(req.body.fileKey || "");
      const uploadToken = req.body.fileUploadToken;
      const expectedPrefix = `submissions/${assessmentId}/${studentId}/`;
      const receipt = verifyUploadReceipt(uploadToken, {
        key,
        ownerId: studentId,
        purpose: `assessment:${assessmentId}`,
      });
      if (!key.startsWith(expectedPrefix) || !receipt) {
        return res
          .status(400)
          .json({ success: false, message: "A completed file upload is required." });
      }
      const metadata = await privateObjectMetadata(key).catch(() => null);
      if (!metadata) {
        return res.status(409).json({ success: false, message: "The file upload is incomplete." });
      }
      if (!uploadMatchesReceipt(receipt, metadata)) {
        await deletePrivateObject(key).catch(() => undefined);
        return res.status(409).json({
          success: false,
          message: "The uploaded file does not match the approved file.",
        });
      }
      fileUrl = privateObjectReference(key);
    } else {
      textContent = String(req.body.textContent || "").trim();
      if (!textContent || textContent.length > 100_000) {
        return res.status(400).json({ success: false, message: "Text submission is required." });
      }
    }

    const submission = await prisma.assessmentSubmission.upsert({
      where: { assessmentId_studentId: { assessmentId, studentId } },
      update: {
        fileUrl,
        textContent,
        status: GradeStatus.SUBMITTED,
        submittedAt: new Date(),
        grade: null,
        feedback: null,
        gradedAt: null,
        gradedById: null,
      },
      create: {
        assessmentId,
        studentId,
        fileUrl,
        textContent,
        status: GradeStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
    const recipients = [
      assessment.createdBy.id,
      ...assessment.assignedAssistants.map((entry) => entry.assistantId),
    ];
    await NotificationService.createMultipleNotifications(
      "ASSESSMENT_SUBMITTED",
      "New Assessment Submission",
      `A learner submitted "${assessment.title}".`,
      [...new Set(recipients)],
      { assessmentId, submissionId: submission.id, courseId: assessment.courseId },
    );
    return res.status(200).json({ success: true, submission });
  } catch (error) {
    logger.error("Failed to submit assessment:", error);
    return res.status(500).json({ success: false, message: "Failed to submit assessment." });
  }
};

export const gradeAssessmentController = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const submission = await prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: { select: { id: true, title: true, courseId: true, totalMarks: true } },
      },
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }
    if (!(await canGradeAssessment(req.user!, submission.assessmentId))) {
      return res.status(403).json({ success: false, message: "You cannot grade this submission." });
    }
    if (submission.status !== GradeStatus.SUBMITTED) {
      return res
        .status(409)
        .json({ success: false, message: "Only submitted work can be graded." });
    }
    const grade = Number(req.body.grade);
    if (!Number.isFinite(grade) || grade < 0 || grade > submission.assessment.totalMarks) {
      return res.status(400).json({ success: false, message: "Grade is outside the valid range." });
    }
    const graded = await prisma.assessmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: req.body.feedback ? String(req.body.feedback).trim().slice(0, 5000) : null,
        status: GradeStatus.GRADED,
        gradedAt: new Date(),
        gradedById: req.user!.id,
      },
      include: { assessment: { select: { title: true, courseId: true, totalMarks: true } } },
    });
    await NotificationService.createNotification({
      type: "ASSESSMENT_GRADED",
      title: "Assessment Graded",
      message: `Your submission for "${graded.assessment.title}" has been graded.`,
      recipientId: graded.studentId,
      metadata: { assessmentId: graded.assessmentId, submissionId, grade },
    });
    return res.status(200).json({ success: true, submission: graded });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to grade submission." });
  }
};

export const getAssessmentDetailsController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    if (!(await canGradeAssessment(req.user!, assessmentId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot access this assessment." });
    }
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, isDeleted: false },
      include: assessmentInclude,
    });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found." });
    }
    return res.status(200).json({ success: true, assessment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assessment." });
  }
};

export const getAssessmentDetailsForStudentController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, isDeleted: false },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        questions: { select: { id: true, text: true, marks: true } },
      },
    });
    if (!assessment || !(await canAccessCourse(req.user!, assessment.courseId))) {
      return res.status(404).json({ success: false, message: "Assessment not found." });
    }
    const submission = await prisma.assessmentSubmission.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId: req.user!.id } },
    });
    return res.status(200).json({ success: true, assessment, submission });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assessment." });
  }
};

export const getSubmissionsForAssessmentController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    if (!(await canGradeAssessment(req.user!, assessmentId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot view these submissions." });
    }
    const submissions = await prisma.assessmentSubmission.findMany({
      where: { assessmentId },
      include: { student: { select: basicUserSelect } },
      orderBy: { submittedAt: "desc" },
    });
    return res.status(200).json({ success: true, submissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch submissions." });
  }
};

export const getAllAssessmentsController = async (_req: Request, res: Response) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { isDeleted: false },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
        createdBy: { select: basicUserSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, assessments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assessments." });
  }
};

export const updateAssessmentController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    if (!(await canManageAssessment(req.user!, assessmentId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot update this assessment." });
    }
    const existing = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { _count: { select: { submissions: true } } },
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Assessment not found." });
    }
    if (existing._count.submissions > 0 && req.body.submissionType !== undefined) {
      return res
        .status(409)
        .json({ success: false, message: "Submission type cannot change after submissions." });
    }
    if (req.body.courseId && !(await canManageCourse(req.user!, req.body.courseId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot move this assessment there." });
    }
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid due date." });
    }
    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(req.body.title !== undefined ? { title: String(req.body.title).trim() } : {}),
        ...(req.body.description !== undefined
          ? { description: String(req.body.description).trim() || null }
          : {}),
        ...(req.body.dueDate !== undefined ? { dueDate } : {}),
        ...(req.body.totalMarks !== undefined ? { totalMarks: Number(req.body.totalMarks) } : {}),
        ...(req.body.submissionType !== undefined
          ? { submissionType: req.body.submissionType }
          : {}),
        ...(req.body.courseId ? { courseId: req.body.courseId } : {}),
      },
      include: assessmentInclude,
    });
    return res.status(200).json({ success: true, assessment: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update assessment." });
  }
};

export const deleteAssessmentController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    if (!(await canManageAssessment(req.user!, assessmentId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot archive this assessment." });
    }
    await prisma.assessment.update({ where: { id: assessmentId }, data: { isDeleted: true } });
    return res.status(200).json({ success: true, message: "Assessment archived." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to archive assessment." });
  }
};

export const getAssessmentAnalyticsController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    if (!(await canGradeAssessment(req.user!, assessmentId))) {
      return res.status(403).json({ success: false, message: "You cannot view this report." });
    }
    const grades = (
      await prisma.assessmentSubmission.findMany({
        where: { assessmentId, status: GradeStatus.GRADED, grade: { not: null } },
        select: { grade: true },
      })
    ).map((entry) => entry.grade as number);
    return res.status(200).json({
      success: true,
      analytics: {
        averageGrade: grades.length
          ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length
          : 0,
        submissionCount: grades.length,
        highestGrade: grades.length ? Math.max(...grades) : 0,
        lowestGrade: grades.length ? Math.min(...grades) : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch analytics." });
  }
};

export const addBulkAssessmentQuestionsController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    if (!(await canManageAssessment(req.user!, assessmentId))) {
      return res.status(403).json({ success: false, message: "You cannot edit this assessment." });
    }
    const questions = parseQuestions(req.body.questions);
    if (!questions.length || questions.length > 200) {
      return res.status(400).json({ success: false, message: "Provide 1 to 200 questions." });
    }
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { totalMarks: true, questions: { select: { marks: true } } },
    });
    if (!assessment) {
      return res.status(404).json({ success: false, message: "Assessment not found." });
    }
    const newTotal = [
      ...assessment.questions.map((question) => question.marks),
      ...questions.map((question) => question.marks),
    ].reduce((sum, marks) => sum + marks, 0);
    if (newTotal > assessment.totalMarks) {
      return res
        .status(400)
        .json({ success: false, message: "Question marks exceed total marks." });
    }
    await prisma.assessmentQuestion.createMany({
      data: questions.map((question) => ({ ...question, assessmentId })),
    });
    return res.status(201).json({ success: true, message: `${questions.length} questions added.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add questions.";
    return res.status(400).json({ success: false, message });
  }
};

export const getMyAssessmentsController = async (req: Request, res: Response) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: {
        isDeleted: false,
        OR: [
          { createdById: req.user!.id },
          { course: { teachers: { some: { teacherId: req.user!.id } } } },
        ],
      },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { submissions: true } },
        createdBy: { select: basicUserSelect },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, assessments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assessments." });
  }
};

export const getAssessmentsForAssistantController = async (req: Request, res: Response) => {
  try {
    const where = isPlatformAdmin(req.user!)
      ? { isDeleted: false }
      : req.user!.role === Role.TEACHER
        ? {
            isDeleted: false,
            OR: [
              { createdById: req.user!.id },
              { course: { teachers: { some: { teacherId: req.user!.id } } } },
            ],
          }
        : {
            isDeleted: false,
            assignedAssistants: { some: { assistantId: req.user!.id } },
          };
    const assessments = await prisma.assessment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: basicUserSelect },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, assessments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assessments." });
  }
};

export const getAssessmentsByCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    if (!(await canAccessCourse(req.user!, courseId))) {
      return res
        .status(403)
        .json({ success: false, message: "You are not enrolled in this course." });
    }
    const assessments = await prisma.assessment.findMany({
      where: { courseId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ success: true, assessments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assessments." });
  }
};

export const getPresignedUrlController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, isDeleted: false },
      select: { courseId: true, dueDate: true, submissionType: true },
    });
    if (
      !assessment ||
      assessment.submissionType !== SubmissionType.FILE_UPLOAD ||
      !(await canAccessCourse(req.user!, assessment.courseId))
    ) {
      return res.status(403).json({ success: false, message: "File upload is not allowed." });
    }
    if (assessment.dueDate && assessment.dueDate < new Date()) {
      return res.status(409).json({ success: false, message: "The deadline has passed." });
    }
    const fileType = String(req.body.fileType || "");
    const fileSize = Number(req.body.fileSize);
    const allowedTypes: readonly string[] = [
      ...UPLOAD.ALLOWED_DOCUMENT_TYPES,
      ...UPLOAD.ALLOWED_IMAGE_TYPES,
    ];
    if (
      !allowedTypes.includes(fileType) ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > UPLOAD.MAX_FILE_SIZE
    ) {
      return res.status(400).json({ success: false, message: "Invalid file type or size." });
    }
    const extension =
      String(req.body.fileName || "file")
        .split(".")
        .pop()
        ?.slice(0, 10) || "bin";
    const key = `submissions/${assessmentId}/${req.user!.id}/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await generatePresignedUploadUrl(key, fileType);
    const uploadToken = createUploadReceipt({
      key,
      ownerId: req.user!.id,
      purpose: `assessment:${assessmentId}`,
      contentType: fileType,
      size: fileSize,
    });
    return res.status(200).json({
      success: true,
      uploadUrl,
      key,
      uploadToken,
      headers: {
        "Content-Type": fileType,
        ...(USE_AZURE_STORAGE ? { "x-ms-blob-type": "BlockBlob" } : {}),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to prepare upload." });
  }
};

export const getSubmissionUrlController = async (req: Request, res: Response) => {
  try {
    const submission = await prisma.assessmentSubmission.findUnique({
      where: { id: req.params.submissionId },
      select: { assessmentId: true, studentId: true, fileUrl: true },
    });
    if (!submission?.fileUrl) {
      return res.status(404).json({ success: false, message: "Submission file not found." });
    }
    if (
      submission.studentId !== req.user!.id &&
      !(await canGradeAssessment(req.user!, submission.assessmentId))
    ) {
      return res.status(403).json({ success: false, message: "You cannot view this submission." });
    }
    const signedUrl = await generatePresignedViewUrl(extractPrivateKey(submission.fileUrl));
    return res.status(200).json({ success: true, signedUrl });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to generate file URL." });
  }
};

export const assignAssistantController = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const assistantId = String(req.body.assistantId || "");
    if (!(await canManageAssessment(req.user!, assessmentId))) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot assign this assessment." });
    }
    const [assessment, assistant] = await Promise.all([
      prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { course: { select: { id: true, title: true } } },
      }),
      prisma.user.findFirst({
        where: { id: assistantId, role: Role.ASSISTANT, isDeleted: false, isSuspended: false },
        select: basicUserSelect,
      }),
    ]);
    if (!assessment || !assistant) {
      return res
        .status(404)
        .json({ success: false, message: "Assessment or assistant not found." });
    }
    await prisma.assessmentAssistant.upsert({
      where: { assessmentId_assistantId: { assessmentId, assistantId } },
      create: { assessmentId, assistantId },
      update: {},
    });
    await NotificationService.notifyAssistantGradingAssignment(
      assistantId,
      assessmentId,
      assessment.title,
      assessment.course.id,
      assessment.course.title,
      req.user!.email,
      { assignedById: req.user!.id, dueDate: assessment.dueDate?.toISOString() },
    );
    return res.status(200).json({ success: true, message: "Assistant assigned and notified." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to assign assistant." });
  }
};

export const getAssignedAssessmentsForAssistantController = async (req: Request, res: Response) => {
  try {
    const assignments = await prisma.assessmentAssistant.findMany({
      where: { assistantId: req.user!.id, assessment: { isDeleted: false } },
      include: {
        assessment: {
          include: {
            course: { select: { id: true, title: true } },
            createdBy: { select: basicUserSelect },
            _count: { select: { submissions: true } },
          },
        },
      },
    });
    return res.status(200).json({
      success: true,
      assessments: assignments.map((assignment) => assignment.assessment),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch assignments." });
  }
};
