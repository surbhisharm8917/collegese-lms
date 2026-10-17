import { Request, Response } from "express";
import {
  uploadPrivateFileToS3,
  generatePresignedViewUrl as storageViewUrl,
  generatePresignedUploadUrl,
  privateObjectMetadata,
  privateObjectReference,
  deletePrivateObject,
  extractPrivateObjectKey,
} from "@utils/s3.utils";
import { USE_AZURE_STORAGE } from "../../utils/s3.utils";
import prisma from "../../config/db";
import { logger } from "../../utils/logger";
import { canAccessCourse, canManageCourse } from "../../services/access.service";
import { UPLOAD } from "../../utils/constants";
import crypto from "crypto";
import path from "path";
import {
  createUploadReceipt,
  uploadMatchesReceipt,
  verifyUploadReceipt,
} from "../../utils/uploadReceipt";

export const generatePresignedViewUrl = async (key: string): Promise<string> => {
  return storageViewUrl(key);
};

export const recordedLectureController = {
  createUploadUrl: async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const { fileName, contentType, fileSize } = req.body;
      if (!req.user || !(await canManageCourse(req.user, courseId))) {
        return res
          .status(403)
          .json({ success: false, message: "You cannot upload to this course." });
      }
      if (!UPLOAD.ALLOWED_VIDEO_TYPES.includes(contentType)) {
        return res.status(400).json({ success: false, message: "Unsupported video format." });
      }
      const size = Number(fileSize);
      if (!Number.isFinite(size) || size <= 0 || size > UPLOAD.MAX_DIRECT_VIDEO_SIZE) {
        return res.status(400).json({
          success: false,
          message: "Video size must be between 1 byte and 20 GB.",
        });
      }

      const extension = path
        .extname(String(fileName || "video"))
        .toLowerCase()
        .slice(0, 10);
      const key = `lectures/${courseId}/${req.user.id}/${crypto.randomUUID()}${extension}`;
      const uploadUrl = await generatePresignedUploadUrl(
        key,
        contentType,
        UPLOAD.DIRECT_UPLOAD_URL_TTL_SECONDS,
      );
      const uploadToken = createUploadReceipt(
        {
          key,
          ownerId: req.user.id,
          purpose: `recorded-lecture:${courseId}`,
          contentType,
          size,
        },
        UPLOAD.DIRECT_UPLOAD_URL_TTL_SECONDS * 1000,
      );
      return res.status(200).json({
        success: true,
        uploadUrl,
        key,
        uploadToken,
        expiresInSeconds: UPLOAD.DIRECT_UPLOAD_URL_TTL_SECONDS,
        headers: {
          "Content-Type": contentType,
          ...(USE_AZURE_STORAGE ? { "x-ms-blob-type": "BlockBlob" } : {}),
        },
      });
    } catch (error) {
      logger.error("Failed to create lecture upload URL:", error);
      return res.status(500).json({ success: false, message: "Failed to prepare video upload." });
    }
  },

  completeUpload: async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const { key, uploadToken, title, description, moduleId, chapterId, duration, order } =
        req.body;
      if (!req.user || !(await canManageCourse(req.user, courseId))) {
        return res
          .status(403)
          .json({ success: false, message: "You cannot upload to this course." });
      }
      const expectedPrefix = `lectures/${courseId}/${req.user.id}/`;
      if (typeof key !== "string" || !key.startsWith(expectedPrefix)) {
        return res.status(400).json({ success: false, message: "Invalid upload key." });
      }
      const parsedDuration = Number(duration);
      const parsedOrder = Number(order);
      if (
        !String(title || "").trim() ||
        !Number.isFinite(parsedDuration) ||
        parsedDuration <= 0 ||
        !Number.isInteger(parsedOrder) ||
        parsedOrder < 1
      ) {
        return res.status(400).json({ success: false, message: "Invalid lecture metadata." });
      }
      const receipt = verifyUploadReceipt(uploadToken, {
        key,
        ownerId: req.user.id,
        purpose: `recorded-lecture:${courseId}`,
      });
      if (!receipt) {
        return res
          .status(400)
          .json({ success: false, message: "Upload receipt is invalid or expired." });
      }
      const metadata = await privateObjectMetadata(key).catch(() => null);
      if (!metadata) {
        return res.status(409).json({
          success: false,
          message: "The video upload has not completed. Please retry after it finishes.",
        });
      }
      if (!uploadMatchesReceipt(receipt, metadata)) {
        await deletePrivateObject(key).catch(() => undefined);
        return res.status(409).json({
          success: false,
          message: "The uploaded video does not match the approved file.",
        });
      }
      if ((moduleId && !chapterId) || (!moduleId && chapterId)) {
        return res.status(400).json({
          success: false,
          message: "Select both a subject and chapter for the lecture.",
        });
      }
      if (moduleId && chapterId) {
        const chapter = await prisma.chapter.findFirst({
          where: { id: chapterId, moduleId, subject: { courseId } },
          select: { id: true },
        });
        if (!chapter) {
          return res.status(400).json({
            success: false,
            message: "Chapter does not belong to the selected subject and course.",
          });
        }
      }

      const videoUrl = privateObjectReference(key);
      const existing = await prisma.recordedLecture.findFirst({ where: { videoUrl } });
      if (existing) {
        return res.status(200).json({ success: true, lecture: existing });
      }
      const lecture = await prisma.recordedLecture.create({
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : undefined,
          videoUrl,
          courseId,
          moduleId: moduleId || undefined,
          chapterId: chapterId || undefined,
          duration: parsedDuration,
          order: parsedOrder,
          teacherId: req.user.id,
        },
      });
      return res.status(201).json({
        success: true,
        message: "Lecture uploaded successfully.",
        lecture,
      });
    } catch (error) {
      logger.error("Failed to complete lecture upload:", error);
      return res.status(500).json({ success: false, message: "Failed to save lecture." });
    }
  },

  uploadLecture: async (req: Request, res: Response) => {
    const file = req.file;
    const { courseId } = req.params;
    const { title, description, moduleId, chapterId, duration, order } = req.body;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    if (!duration || !order) {
      return res.status(400).json({ error: "Missing required fields: duration or order." });
    }
    try {
      if (!req.user || !(await canManageCourse(req.user, courseId))) {
        return res.status(403).json({ error: "You cannot upload to this course." });
      }
      if ((moduleId && !chapterId) || (!moduleId && chapterId)) {
        return res.status(400).json({
          error: "Select both a subject and chapter for the lecture.",
        });
      }
      if (moduleId && chapterId) {
        const chapter = await prisma.chapter.findFirst({
          where: { id: chapterId, moduleId, subject: { courseId } },
          select: { id: true },
        });
        if (!chapter) {
          return res.status(400).json({
            error: "Chapter does not belong to the selected subject and course.",
          });
        }
      }
      const filename = `lectures/${courseId}/${req.user.id}/${crypto.randomUUID()}${path.extname(file.originalname)}`;
      const videoUrl = await uploadPrivateFileToS3(file.buffer, file.mimetype, filename);
      const newLecture = await prisma.recordedLecture.create({
        data: {
          title,
          description,
          videoUrl,
          courseId,
          moduleId,
          chapterId: chapterId || undefined,
          duration: Number(duration),
          order: Number(order),
          teacherId: req.user.id,
        },
      });
      res.status(201).json({
        message: "Lecture uploaded successfully!",
        lecture: newLecture,
      });
    } catch (error) {
      logger.error("Error uploading lecture:", error);
      res.status(500).json({ error: "Failed to upload lecture." });
    }
  },

  getLecturesByCourse: async (req: Request, res: Response) => {
    const { courseId } = req.params as Record<string, string>;

    try {
      if (!req.user || !(await canAccessCourse(req.user, courseId))) {
        return res.status(403).json({ error: "You cannot access this course." });
      }
      const lectures = await prisma.recordedLecture.findMany({
        where: { courseId },
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          order: true,
          courseId: true,
          moduleId: true,
          chapterId: true,
          teacherId: true,
          createdAt: true,
          updatedAt: true,
          module: { select: { id: true, title: true, order: true } },
          chapter: { select: { id: true, title: true, order: true } },
        },
        orderBy: [
          { module: { order: "asc" } },
          { chapter: { order: "asc" } },
          { order: "asc" },
          { createdAt: "asc" },
        ],
      });

      return res.status(200).json(
        lectures.map(({ module, ...lecture }) => ({
          ...lecture,
          subject: module,
        })),
      );
    } catch (error) {
      logger.error("Error fetching lectures:", error);
      return res.status(500).json({ error: "Failed to retrieve lectures." });
    }
  },

  getAdminLectures: async (_req: Request, res: Response) => {
    try {
      const lectures = await prisma.recordedLecture.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          duration: true,
          order: true,
          teacherId: true,
          createdAt: true,
          course: { select: { id: true, title: true, category: true } },
          module: { select: { id: true, title: true, order: true } },
          chapter: { select: { id: true, title: true, order: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      });
      const uploaderIds = [
        ...new Set(
          lectures
            .map((lecture) => lecture.teacherId)
            .filter((id): id is string => typeof id === "string"),
        ),
      ];
      const uploaders = await prisma.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, name: true, email: true, role: true },
      });
      const uploaderById = new Map(uploaders.map((user) => [user.id, user]));

      return res.json({
        success: true,
        lectures: lectures.map(({ module, teacherId, ...lecture }) => ({
          ...lecture,
          subject: module,
          uploader: teacherId ? uploaderById.get(teacherId) || null : null,
        })),
      });
    } catch (error) {
      logger.error("Failed to fetch administrator lecture library:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch lectures." });
    }
  },

  getLectureProgress: async (req: Request, res: Response) => {
    const { userId, recordedLectureId } = req.params as Record<string, string>;
    try {
      const lecture = await prisma.recordedLecture.findUnique({
        where: { id: recordedLectureId },
        select: { courseId: true },
      });
      if (!lecture) {
        return res.status(404).json({ error: "Lecture not found." });
      }
      if (
        !req.user ||
        (req.user.id !== userId && !(await canManageCourse(req.user, lecture.courseId))) ||
        !(await canAccessCourse(req.user, lecture.courseId))
      ) {
        return res.status(403).json({ error: "You cannot view this progress." });
      }
      const lectureProgress = await prisma.lectureProgress.findUnique({
        where: { userId_recordedLectureId: { userId, recordedLectureId } },
      });
      if (!lectureProgress) {
        return res.status(200).json({ progress: 0, completed: false });
      }
      res.status(200).json(lectureProgress);
    } catch (error) {
      logger.error("Error fetching lecture progress:", error);
      res.status(500).json({ error: "Failed to retrieve lecture progress." });
    }
  },

  getSignedUrl: async (req: Request, res: Response) => {
    const { lectureId } = req.params as Record<string, string>;
    try {
      const lecture = await prisma.recordedLecture.findUnique({
        where: { id: lectureId },
        select: { videoUrl: true, courseId: true },
      });
      if (!lecture) {
        return res.status(404).json({ error: "Lecture not found." });
      }
      if (!req.user || !(await canAccessCourse(req.user, lecture.courseId))) {
        return res.status(403).json({ error: "You cannot access this lecture." });
      }
      const key = extractPrivateObjectKey(lecture.videoUrl);
      const signedUrl = await storageViewUrl(key);
      res.status(200).json({ signedUrl });
    } catch (error) {
      logger.error("Error generating signed URL:", error);
      res.status(500).json({ error: "Failed to generate signed URL." });
    }
  },

  updateLecture: async (req: Request, res: Response) => {
    const { lectureId } = req.params as Record<string, string>;
    const { title, description, order, duration, moduleId, chapterId } = req.body;

    try {
      const lecture = await prisma.recordedLecture.findUnique({
        where: { id: lectureId },
        select: { courseId: true },
      });
      if (!lecture) {
        return res.status(404).json({ error: "Lecture not found." });
      }
      if (!req.user || !(await canManageCourse(req.user, lecture.courseId))) {
        return res.status(403).json({ error: "You cannot update this lecture." });
      }
      if (moduleId !== undefined || chapterId !== undefined) {
        if (!moduleId || !chapterId) {
          return res.status(400).json({
            error: "Select both a subject and chapter for the lecture.",
          });
        }
        const chapter = await prisma.chapter.findFirst({
          where: { id: chapterId, moduleId, subject: { courseId: lecture.courseId } },
          select: { id: true },
        });
        if (!chapter) {
          return res.status(400).json({
            error: "Chapter does not belong to the selected subject and course.",
          });
        }
      }
      const updateData: any = {};

      if (title !== undefined) {
        updateData.title = title;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (order !== undefined) {
        updateData.order = Number(order);
      }
      if (duration !== undefined) {
        updateData.duration = Number(duration);
      }
      if (moduleId !== undefined && chapterId !== undefined) {
        updateData.moduleId = moduleId;
        updateData.chapterId = chapterId;
      }

      const updatedLecture = await prisma.recordedLecture.update({
        where: { id: lectureId },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        message: "Lecture updated successfully!",
        lecture: updatedLecture,
      });
    } catch (error: any) {
      logger.error("Error updating lecture:", error);

      if (error.code === "P2025") {
        return res.status(404).json({ error: "Lecture not found." });
      }

      res.status(500).json({ error: "Failed to update lecture." });
    }
  },

  deleteLecture: async (req: Request, res: Response) => {
    const { lectureId } = req.params as Record<string, string>;
    try {
      const lectureToDelete = await prisma.recordedLecture.findUnique({
        where: { id: lectureId },
      });
      if (!lectureToDelete) {
        return res.status(404).json({ error: "Lecture not found." });
      }
      if (!req.user || !(await canManageCourse(req.user, lectureToDelete.courseId))) {
        return res.status(403).json({ error: "You cannot delete this lecture." });
      }
      // Best-effort delete of the underlying file across whichever driver is active.
      try {
        await deletePrivateObject(lectureToDelete.videoUrl);
      } catch (delErr) {
        logger.error("Failed to delete lecture file from storage:", delErr);
      }
      await prisma.$transaction([
        prisma.lectureProgress.deleteMany({ where: { recordedLectureId: lectureId } }),
        prisma.recordedLecture.delete({ where: { id: lectureId } }),
      ]);
      res.status(200).json({ success: true, message: "Lecture deleted successfully." });
    } catch (error) {
      logger.error("Error deleting lecture:", error);
      res.status(500).json({ error: "Failed to delete lecture." });
    }
  },

  updateLectureProgress: async (req: Request, res: Response) => {
    const { userId, recordedLectureId } = req.params as Record<string, string>;
    const { progress } = req.body;
    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only update your own progress." });
    }
    if (progress === undefined) {
      return res.status(400).json({ error: "Progress value is missing." });
    }
    try {
      const lecture = await prisma.recordedLecture.findUnique({
        where: { id: recordedLectureId },
        select: { courseId: true },
      });
      if (!lecture) {
        return res.status(404).json({ error: "Lecture not found." });
      }
      if (!(await canAccessCourse(req.user, lecture.courseId))) {
        return res.status(403).json({ error: "You cannot access this lecture." });
      }
      const numericProgress = Math.max(0, Math.min(100, Number(progress)));
      if (!Number.isFinite(numericProgress)) {
        return res.status(400).json({ error: "Progress must be a number from 0 to 100." });
      }
      const isCompleted = numericProgress >= 90;
      await prisma.lectureProgress.upsert({
        where: { userId_recordedLectureId: { userId, recordedLectureId } },
        update: { progress: Math.round(numericProgress), completed: isCompleted },
        create: {
          userId,
          recordedLectureId,
          progress: Math.round(numericProgress),
          completed: isCompleted,
        },
      });
      const totalLectures = await prisma.recordedLecture.count({
        where: { courseId: lecture.courseId },
      });
      const completedLectures = await prisma.lectureProgress.count({
        where: {
          userId,
          recordedLecture: {
            courseId: lecture.courseId,
          },
          completed: true,
        },
      });
      const courseProgress = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;
      await prisma.courseEnrollment.update({
        where: { userId_courseId: { userId, courseId: lecture.courseId } },
        data: { progress: Math.round(courseProgress) },
      });
      res.status(200).json({ message: "Lecture progress updated successfully." });
    } catch (error) {
      logger.error("Error updating lecture progress:", error);
      res.status(500).json({ error: "Failed to update lecture progress." });
    }
  },
};
