import express from "express";
import {
  registerController,
  loginController,
  verifyEmailController,
  logoutController,
  verifyController,
  resendVerificationEmailController,
  verifyOtpController,
  resendOtpController,
} from "../controllers/auth.controller";
import {
  forgotPasswordController,
  changePasswordController,
  resetPasswordController,
} from "../controllers/password.controller";

import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.middleware";
import { uploadProfilePic } from "@middlewares/multer.middleware";
import { loginLimiter, otpLimiter } from "../middlewares/security.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from "../utils/validation.schemas";

const authRouter = express.Router();

authRouter.post("/register", uploadProfilePic, validateBody(registerSchema), registerController);
// Step 1 of sign-in: password check + emailed code. Sets no cookie on its own.
authRouter.post("/login", loginLimiter, validateBody(loginSchema), loginController);
// Step 2 for both registration and sign-in: exchange the emailed code for
// account activation (REGISTRATION) or a session cookie (LOGIN).
authRouter.post("/otp/verify", otpLimiter, validateBody(verifyOtpSchema), verifyOtpController);
authRouter.post("/otp/resend", otpLimiter, validateBody(resendOtpSchema), resendOtpController);
authRouter.get("/verify-email", verifyEmailController);
authRouter.post(
  "/resend-verification",
  loginLimiter,
  validateBody(resendVerificationSchema),
  resendVerificationEmailController,
);
// NOTE: /status/maintenance is mounted directly in server.ts (before authLimiter)
authRouter.post(
  "/forgot-password",
  loginLimiter,
  validateBody(forgotPasswordSchema),
  forgotPasswordController,
);
authRouter.post(
  "/change-password",
  authMiddleware,
  validateBody(changePasswordSchema),
  changePasswordController,
);
authRouter.post(
  "/reset-password",
  loginLimiter,
  validateBody(resetPasswordSchema),
  resetPasswordController,
);
authRouter.get("/verify", optionalAuthMiddleware, verifyController);
authRouter.get("/reset-password", (req, res) => {
  res.status(200).send("Token is valid. You can now reset your password.");
});
authRouter.post("/logout", authMiddleware, logoutController);

export default authRouter;
