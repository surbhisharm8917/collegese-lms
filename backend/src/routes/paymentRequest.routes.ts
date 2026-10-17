import { Router } from "express";
import { isAdmin, isStudent } from "../middlewares/adminAuth/admin.auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import {
  preparePaymentUploadSchema,
  rejectPaymentRequestSchema,
  submitPaymentRequestSchema,
} from "../utils/validation.schemas";
import {
  approvePaymentRequest,
  getAdminPaymentRequests,
  getMyPaymentRequests,
  getPaymentQr,
  getPaymentSettings,
  preparePaymentProofUpload,
  rejectPaymentRequest,
  submitPaymentRequest,
} from "../controllers/paymentRequest.controller";

const paymentRequestRouter = Router();

paymentRequestRouter.get("/me", isStudent, getMyPaymentRequests);
paymentRequestRouter.get("/settings", isStudent, getPaymentSettings);
paymentRequestRouter.get("/qr", isStudent, getPaymentQr);
paymentRequestRouter.post(
  "/prepare-upload",
  isStudent,
  validateBody(preparePaymentUploadSchema),
  preparePaymentProofUpload,
);
paymentRequestRouter.post(
  "/submit",
  isStudent,
  validateBody(submitPaymentRequestSchema),
  submitPaymentRequest,
);
paymentRequestRouter.get("/admin", isAdmin, getAdminPaymentRequests);
paymentRequestRouter.post("/:id/approve", isAdmin, approvePaymentRequest);
paymentRequestRouter.post(
  "/:id/reject",
  isAdmin,
  validateBody(rejectPaymentRequestSchema),
  rejectPaymentRequest,
);

export default paymentRequestRouter;
