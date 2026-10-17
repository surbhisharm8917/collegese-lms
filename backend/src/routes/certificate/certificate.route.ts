import {
  generateCertificate,
  verifyCertificate,
  getUserCertificates,
  getCertificateById,
  revokeCertificate,
  getAllUsersCoursesWithProgress,
  getAllCertificates,
} from "@controllers/certificate/certificate.controller";
import { Router } from "express";
import { authMiddleware } from "@middlewares/auth.middleware";
import { isAssistant } from "@middlewares/adminAuth/admin.auth.middleware";

const certificateRouter = Router();

// Issue / revoke certificates — assistant and above (matches dashboard access)
certificateRouter.post("/generate", authMiddleware, isAssistant, generateCertificate);
certificateRouter.delete("/:id", authMiddleware, isAssistant, revokeCertificate);

// Verify a certificate (explicit POST action with side effects) — assistant and above
certificateRouter.post("/verify/:certificateId", authMiddleware, isAssistant, verifyCertificate);

// Listing / reporting — assistant and above
certificateRouter.get("/", authMiddleware, isAssistant, getAllCertificates);
certificateRouter.get(
  "/all-users/courses-progress",
  authMiddleware,
  isAssistant,
  getAllUsersCoursesWithProgress,
);
certificateRouter.get("/user/:userId", authMiddleware, getUserCertificates);
certificateRouter.get("/:id", authMiddleware, getCertificateById);

export default certificateRouter;
