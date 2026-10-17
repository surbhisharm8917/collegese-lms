import { Request, Response } from "express";
import { uploadPublicFileToS3 } from "@utils/s3.utils";
import { v4 as uuidv4 } from "uuid";
import prisma from "../../config/db";
import { logger } from "../../utils/logger";
import { AUTH } from "../../utils/constants";
import { getClearAuthCookieOptions } from "../../utils/cookies";
import { hashToken } from "../../utils/auth.utils";
import { safeUserSelect, sanitizeUser } from "../../utils/user.select";
import { canGradeAssessment, canManageQuiz } from "../../services/access.service";

export const getUserSessionsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
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
      orderBy: {
        loginTime: "desc",
      },
    });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user sessions.",
    });
  }
};

export const logoutController = async (req: Request, res: Response) => {
  try {
    const token = req.cookies[AUTH.COOKIE_NAME];

    if (!token) {
      return res.status(200).json({ success: true, message: "Already logged out." });
    }

    await prisma.session.deleteMany({
      where: {
        token: hashToken(token),
      },
    });

    res.clearCookie(AUTH.COOKIE_NAME, getClearAuthCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to log out.",
    });
  }
};

export const logoutSessionByIdController = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    // Only the session owner (or an admin) may revoke a session.
    const isAdmin = requesterRole === "ADMIN" || requesterRole === "SUPER_ADMIN";
    if (session.userId !== requesterId && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: You can only revoke your own sessions." });
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });

    res.status(200).json({ success: true, message: "Session logged out successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to log out session." });
  }
};

export const getUserSessionsByAdminController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;

    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
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
      orderBy: {
        loginTime: "desc",
      },
    });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user sessions.",
    });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error("❌ Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Failed to fetch user profile." });
  }
};

export const updateUserProfileController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const body = req.body || {};
    const allowedFields = ["name", "phone", "address", "bio"];
    const updateData: any = {};

    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    if (req.file) {
      const fileKey = `profile-pics/${userId}-${uuidv4()}-${req.file.originalname}`;
      const fileUrl = await uploadPublicFileToS3(req.file.buffer, req.file.mimetype, fileKey);
      updateData.profilePic = fileUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update profile.",
    });
  }
};

export const getQuizCompletionStatus = async (req: Request, res: Response) => {
  try {
    const { studentId, quizId } = req.params as Record<string, string>;

    // Students may only check their own completion status; staff can check anyone's.
    const requester = req.user!;
    if (requester.id !== studentId && !(await canManageQuiz(requester, quizId))) {
      return res.status(403).json({ error: "Forbidden: You can only view your own status." });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, isDeleted: false },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const submission = await prisma.quizSubmission.findFirst({
      where: { userId: studentId, quizId },
      orderBy: { attemptNumber: "desc" },
    });

    if (submission) {
      return res.status(200).json({
        completed: submission.status !== "IN_PROGRESS",
        status: submission.status,
        score: submission.score,
        startTime: submission.startTime,
        endTime: submission.endTime,
        submittedAt: submission.submittedAt,
      });
    } else {
      return res.status(200).json({
        completed: false,
        status: null,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAssessmentCompletionStatus = async (req: Request, res: Response) => {
  try {
    const { studentId, assessmentId } = req.params as Record<string, string>;

    // Students may only check their own completion status; staff can check anyone's.
    const requester = req.user!;
    if (requester.id !== studentId && !(await canGradeAssessment(requester, assessmentId))) {
      return res.status(403).json({ error: "Forbidden: You can only view your own status." });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, isDeleted: false },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const submission = await prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId: assessmentId,
          studentId: studentId,
        },
      },
    });

    if (submission) {
      return res.status(200).json({
        completed: true,
        status: submission.status,
        submittedAt: submission.submittedAt,
        grade: submission.grade,
        feedback: submission.feedback,
        gradedAt: submission.gradedAt,
      });
    } else {
      return res.status(200).json({
        completed: false,
        status: "NOT_SUBMITTED",
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
