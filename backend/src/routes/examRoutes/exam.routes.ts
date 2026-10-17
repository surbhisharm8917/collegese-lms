import { Router } from "express";
import {
  createExam,
  deleteExam,
  getAttemptsByUser,
  getExamById,
  getExamsByCourse,
  startExam,
  submitExam,
  updateExam,
  getExamStats,
  createQuestion,
  bulkCreateQuestions,
  getQuestionsByExam,
  updateQuestion,
  deleteQuestion,
  getAllExams,
  getExamAttemptStatus,
  getPassedExamsUser,
  getFailedUsersForExam,
  getPendingEvaluations,
  evaluateSubjectiveAnswers,
  uploadExamRecording,
  getMyExamAttempts,
  sendBulkExamResults,
  getExamAttemptById,
  getExamRecordingPresignedUrl,
  publishExam,
  cancelExam,
  createExamRecordingUploadUrl,
  completeExamRecordingUpload,
} from "@controllers/exam/exam.controller";

import { authMiddleware } from "@middlewares/auth.middleware";
import { uploadVideo } from "@middlewares/multer.middleware";
import { isAssistant, isStudent, isTeacher } from "@middlewares/adminAuth/admin.auth.middleware";

const ExamRouter = Router();

// ── Staff endpoints (assistant+) ──────────────────────────────
ExamRouter.get("/pending-evaluations", authMiddleware, isAssistant, getPendingEvaluations);
ExamRouter.get(
  "/recordings/presigned-url",
  authMiddleware,
  isAssistant,
  getExamRecordingPresignedUrl,
);
ExamRouter.post("/send-results", authMiddleware, isAssistant, sendBulkExamResults);

// ── Student-facing endpoints (any authenticated user) ─────────
ExamRouter.get("/attempts/me", authMiddleware, getAttemptsByUser);
ExamRouter.get("/mine", authMiddleware, getMyExamAttempts);

ExamRouter.post("/attempt/:attemptId/submit", authMiddleware, isStudent, submitExam);
ExamRouter.post("/attempt/:attemptId/cancel", authMiddleware, isStudent, cancelExam);
ExamRouter.post(
  "/attempt/:attemptId/evaluate",
  authMiddleware,
  isAssistant,
  evaluateSubjectiveAnswers,
);
ExamRouter.get("/:examId/attempt/status", authMiddleware, getExamAttemptStatus);
ExamRouter.get("/attempt/:attemptId", authMiddleware, getExamAttemptById);
ExamRouter.get("/attempts/:attemptId", authMiddleware, getExamAttemptById);

// ── Staff reporting (assistant+) ──────────────────────────────
ExamRouter.get("/:id/passed-users", authMiddleware, isAssistant, getPassedExamsUser);
ExamRouter.get("/:id/failed-users", authMiddleware, isAssistant, getFailedUsersForExam);
ExamRouter.get("/:examId/stats", authMiddleware, isAssistant, getExamStats);

// ── Exam management (teacher+) ────────────────────────────────
ExamRouter.post("/", authMiddleware, isTeacher, createExam);
ExamRouter.put("/:examId/publish", authMiddleware, isTeacher, publishExam);
ExamRouter.get("/course/:courseId", authMiddleware, getExamsByCourse);
ExamRouter.get("/", authMiddleware, getAllExams);

ExamRouter.post("/:examId/start", authMiddleware, isStudent, startExam);
ExamRouter.post(
  "/attempt/:attemptId/recording/upload-url",
  authMiddleware,
  isStudent,
  createExamRecordingUploadUrl,
);
ExamRouter.post(
  "/attempt/:attemptId/recording/complete",
  authMiddleware,
  isStudent,
  completeExamRecordingUpload,
);
ExamRouter.post(
  "/attempt/:attemptId/recording",
  authMiddleware,
  isStudent,
  uploadVideo,
  uploadExamRecording,
);

ExamRouter.get("/:examId", authMiddleware, getExamById);
ExamRouter.put("/:examId", authMiddleware, isTeacher, updateExam);
ExamRouter.delete("/:examId", authMiddleware, isTeacher, deleteExam);

ExamRouter.post("/:examId/questions", authMiddleware, isAssistant, createQuestion);
ExamRouter.post("/:examId/questions/bulk", authMiddleware, isAssistant, bulkCreateQuestions);
ExamRouter.get("/:examId/questions", authMiddleware, getQuestionsByExam);
ExamRouter.put("/questions/:questionId", authMiddleware, isAssistant, updateQuestion);
ExamRouter.delete("/questions/:questionId", authMiddleware, isAssistant, deleteQuestion);

export default ExamRouter;
