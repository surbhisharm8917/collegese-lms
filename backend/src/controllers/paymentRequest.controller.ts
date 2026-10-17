import crypto from "crypto";
import { Request, Response } from "express";
import QRCode from "qrcode";
import { PaymentRequestStatus, Prisma } from "@generated/prisma/client";
import prisma from "../config/db";
import {
  deletePrivateObject,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  privateObjectMetadata,
  USE_AZURE_STORAGE,
} from "../utils/s3.utils";
import {
  createUploadReceipt,
  uploadMatchesReceipt,
  verifyOwnedUploadReceipt,
} from "../utils/uploadReceipt";
import { logger } from "../utils/logger";

const PAYMENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PAYMENT_IMAGE_BYTES = 10 * 1024 * 1024;
const PAYMENT_SETTING_KEYS = [
  "paymentAccountName",
  "paymentAccountNumber",
  "paymentIfsc",
  "paymentUpi",
  "paymentInstructions",
] as const;

const hasBlockingPaymentState = async (studentId: string, courseId: string) => {
  const [enrollment, request] = await Promise.all([
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
      select: { id: true },
    }),
    prisma.coursePaymentRequest.findFirst({
      where: {
        studentId,
        courseId,
        status: { in: [PaymentRequestStatus.PENDING, PaymentRequestStatus.APPROVED] },
      },
      select: { status: true },
    }),
  ]);
  return { enrollment, request };
};

const paymentConflictMessage = (
  state: Awaited<ReturnType<typeof hasBlockingPaymentState>>,
): string | null => {
  if (state.enrollment) {
    return "You are already enrolled in this course.";
  }
  if (state.request?.status === PaymentRequestStatus.PENDING) {
    return "A payment request for this course is already pending.";
  }
  if (state.request?.status === PaymentRequestStatus.APPROVED) {
    return "A payment request for this course has already been approved.";
  }
  return null;
};
export const getMyPaymentRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.coursePaymentRequest.findMany({
      where: { studentId: req.user!.id },
      select: {
        id: true,
        amountInPaise: true,
        currency: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        screenshotContentType: true,
        screenshotSizeBytes: true,
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, requests });
  } catch (error) {
    logger.error("Failed to fetch student payment requests:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment requests." });
  }
};

export const getPaymentSettings = async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: [...PAYMENT_SETTING_KEYS] } },
      select: { key: true, value: true },
    });
    const configuredSettings = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
    const demoSettings =
      process.env.NODE_ENV === "production"
        ? {}
        : {
            paymentAccountName:
              process.env.DEMO_PAYMENT_ACCOUNT_NAME || "Just Easy Academy Demo Account",
            paymentAccountNumber: process.env.DEMO_PAYMENT_ACCOUNT_NUMBER || "000000000000",
            paymentIfsc: process.env.DEMO_PAYMENT_IFSC || "DEMO0000001",
            paymentUpi: process.env.DEMO_PAYMENT_UPI || "demo@upi",
            paymentInstructions:
              process.env.DEMO_PAYMENT_INSTRUCTIONS ||
              "DEMO ONLY — do not transfer real money. Upload any sample JPEG, PNG or WebP screenshot to demonstrate the approval workflow.",
          };
    const settings = { ...demoSettings, ...configuredSettings };
    return res.json({ success: true, settings });
  } catch (error) {
    logger.error("Failed to fetch payment settings:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment settings." });
  }
};

export const getPaymentQr = async (req: Request, res: Response) => {
  try {
    const courseId = typeof req.query.courseId === "string" ? req.query.courseId.trim() : "";
    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course is required." });
    }
    const [course, settings] = await Promise.all([
      prisma.course.findFirst({
        where: { id: courseId, isPublished: true, isActive: true, isDeleted: false },
        select: { id: true, title: true, priceInPaise: true, currency: true },
      }),
      prisma.systemSetting.findMany({
        where: { key: { in: ["paymentAccountName", "paymentUpi"] } },
        select: { key: true, value: true },
      }),
    ]);
    if (!course) {
      return res.status(404).json({ success: false, message: "Course is not available." });
    }
    const payment = Object.fromEntries(settings.map(({ key, value }) => [key, value.trim()]));
    const upi = payment.paymentUpi || "";
    if (!/^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$/.test(upi)) {
      return res.status(422).json({ success: false, message: "A valid UPI ID is not configured." });
    }
    const params = new URLSearchParams({
      pa: upi,
      pn: payment.paymentAccountName || "Just Easy CA Classes",
      am: (course.priceInPaise / 100).toFixed(2),
      cu: course.currency || "INR",
      tn: `Enrollment: ${course.title}`.slice(0, 80),
    });
    const upiUri = `upi://pay?${params.toString()}`;
    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });
    return res.json({
      success: true,
      qrDataUrl,
      upiUri,
      amountInPaise: course.priceInPaise,
      currency: course.currency,
      payeeName: payment.paymentAccountName || "Just Easy CA Classes",
    });
  } catch (error) {
    logger.error("Failed to generate payment QR:", error);
    return res.status(500).json({ success: false, message: "Failed to generate payment QR." });
  }
};

export const preparePaymentProofUpload = async (req: Request, res: Response) => {
  try {
    const { courseId, contentType, fileSize } = req.body as {
      courseId: string;
      contentType: (typeof PAYMENT_IMAGE_TYPES)[number];
      fileSize: number;
    };
    const course = await prisma.course.findFirst({
      where: { id: courseId, isPublished: true, isActive: true, isDeleted: false },
      select: { id: true },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "The selected course is not available for payment.",
      });
    }

    const conflict = paymentConflictMessage(await hasBlockingPaymentState(req.user!.id, courseId));
    if (conflict) {
      return res.status(409).json({ success: false, message: conflict });
    }

    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const key = `payment-proofs/${req.user!.id}/${courseId}/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await generatePresignedUploadUrl(key, contentType, 15 * 60);
    const uploadReceipt = createUploadReceipt({
      key,
      ownerId: req.user!.id,
      purpose: `payment-proof:${courseId}`,
      contentType,
      size: fileSize,
    });

    return res.json({
      success: true,
      uploadUrl,
      uploadReceipt,
      expiresInSeconds: 15 * 60,
      headers: {
        "Content-Type": contentType,
        ...(USE_AZURE_STORAGE ? { "x-ms-blob-type": "BlockBlob" } : {}),
      },
    });
  } catch (error) {
    logger.error("Failed to prepare payment proof upload:", error);
    return res.status(500).json({ success: false, message: "Failed to prepare proof upload." });
  }
};
export const submitPaymentRequest = async (req: Request, res: Response) => {
  try {
    const { courseId, uploadReceipt } = req.body as {
      courseId: string;
      uploadReceipt: string;
    };
    const receipt = verifyOwnedUploadReceipt(uploadReceipt, {
      ownerId: req.user!.id,
      purpose: `payment-proof:${courseId}`,
    });
    const expectedPrefix = `payment-proofs/${req.user!.id}/${courseId}/`;
    if (
      !receipt ||
      !receipt.key.startsWith(expectedPrefix) ||
      !PAYMENT_IMAGE_TYPES.includes(receipt.contentType as (typeof PAYMENT_IMAGE_TYPES)[number]) ||
      receipt.size > MAX_PAYMENT_IMAGE_BYTES
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Upload receipt is invalid or expired." });
    }

    const metadata = await privateObjectMetadata(receipt.key).catch(() => null);
    if (!metadata) {
      return res.status(409).json({ success: false, message: "Proof upload is not complete." });
    }
    if (!uploadMatchesReceipt(receipt, metadata)) {
      await deletePrivateObject(receipt.key).catch(() => undefined);
      return res.status(409).json({
        success: false,
        message: "Uploaded proof does not match the approved file metadata.",
      });
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, isPublished: true, isActive: true, isDeleted: false },
      select: { id: true, priceInPaise: true, currency: true },
    });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "The selected course is not available for payment.",
      });
    }
    const conflict = paymentConflictMessage(await hasBlockingPaymentState(req.user!.id, courseId));
    if (conflict) {
      return res.status(409).json({ success: false, message: conflict });
    }

    const request = await prisma.coursePaymentRequest.create({
      data: {
        studentId: req.user!.id,
        courseId,
        screenshotObjectKey: receipt.key,
        screenshotContentType: receipt.contentType,
        screenshotSizeBytes: receipt.size,
        amountInPaise: course.priceInPaise,
        currency: course.currency,
      },
      select: {
        id: true,
        courseId: true,
        amountInPaise: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });
    return res.status(201).json({
      success: true,
      message: "Payment request submitted for review.",
      request,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "This proof or payment request has already been submitted.",
      });
    }
    logger.error("Failed to submit payment request:", error);
    return res.status(500).json({ success: false, message: "Failed to submit payment request." });
  }
};
export const getAdminPaymentRequests = async (req: Request, res: Response) => {
  try {
    const statusValue = typeof req.query.status === "string" ? req.query.status : undefined;
    if (
      statusValue &&
      !Object.values(PaymentRequestStatus).includes(statusValue as PaymentRequestStatus)
    ) {
      return res.status(400).json({ success: false, message: "Invalid payment request status." });
    }
    const courseId = typeof req.query.courseId === "string" ? req.query.courseId : undefined;
    const requests = await prisma.coursePaymentRequest.findMany({
      where: {
        ...(statusValue ? { status: statusValue as PaymentRequestStatus } : {}),
        ...(courseId ? { courseId } : {}),
      },
      select: {
        id: true,
        screenshotObjectKey: true,
        screenshotContentType: true,
        screenshotSizeBytes: true,
        amountInPaise: true,
        currency: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { id: true, name: true, email: true, learnerId: true } },
        course: {
          select: { id: true, title: true, category: true, priceInPaise: true, currency: true },
        },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeRequests = await Promise.all(
      requests.map(async ({ screenshotObjectKey, ...request }) => ({
        ...request,
        proofViewUrl: await generatePresignedDownloadUrl(screenshotObjectKey, 5 * 60),
        proofViewExpiresInSeconds: 5 * 60,
      })),
    );
    return res.json({ success: true, requests: safeRequests });
  } catch (error) {
    logger.error("Failed to fetch admin payment requests:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment requests." });
  }
};
class PaymentStateError extends Error {}

export const approvePaymentRequest = async (req: Request, res: Response) => {
  try {
    const request = await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.coursePaymentRequest.updateMany({
          where: { id: req.params.id, status: PaymentRequestStatus.PENDING },
          data: {
            status: PaymentRequestStatus.APPROVED,
            reviewerId: req.user!.id,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        });
        if (claimed.count !== 1) {
          throw new PaymentStateError("Payment request is not pending or does not exist.");
        }
        const pending = await tx.coursePaymentRequest.findUniqueOrThrow({
          where: { id: req.params.id },
          select: { studentId: true, courseId: true },
        });
        await tx.courseEnrollment.upsert({
          where: {
            userId_courseId: { userId: pending.studentId, courseId: pending.courseId },
          },
          create: {
            userId: pending.studentId,
            courseId: pending.courseId,
            status: "IN_PROGRESS",
            progress: 0,
          },
          update: {},
        });
        return tx.coursePaymentRequest.findUniqueOrThrow({
          where: { id: req.params.id },
          select: {
            id: true,
            status: true,
            reviewedAt: true,
            studentId: true,
            courseId: true,
            reviewer: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return res.json({ success: true, message: "Payment approved and student enrolled.", request });
  } catch (error) {
    if (error instanceof PaymentStateError) {
      return res.status(409).json({ success: false, message: error.message });
    }
    logger.error("Failed to approve payment request:", error);
    return res.status(500).json({ success: false, message: "Failed to approve payment request." });
  }
};

export const rejectPaymentRequest = async (req: Request, res: Response) => {
  try {
    const updated = await prisma.coursePaymentRequest.updateMany({
      where: { id: req.params.id, status: PaymentRequestStatus.PENDING },
      data: {
        status: PaymentRequestStatus.REJECTED,
        rejectionReason: req.body.reason,
        reviewerId: req.user!.id,
        reviewedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      return res.status(409).json({
        success: false,
        message: "Payment request is not pending or does not exist.",
      });
    }
    const request = await prisma.coursePaymentRequest.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        studentId: true,
        courseId: true,
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json({ success: true, message: "Payment request rejected.", request });
  } catch (error) {
    logger.error("Failed to reject payment request:", error);
    return res.status(500).json({ success: false, message: "Failed to reject payment request." });
  }
};
