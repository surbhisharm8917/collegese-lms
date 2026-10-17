import { Request, Response } from "express";
import {
  registerUserService,
  loginUserService,
  startOtpLoginService,
  completeOtpLoginService,
  completeRegistrationOtpService,
  verifyEmailService,
  resendVerificationEmailService,
  isVerificationEmailDeliveryEnabled,
  LoginMethodError,
  type LoginMethod,
} from "../services/auth.service";
import {
  isLoginOtpEnabled,
  resendOtpChallenge,
  verifyOtpChallenge,
  OtpError,
  type OtpChallenge,
} from "../services/otp.service";
import { sendLoginNotificationEmail } from "@services/email.service";
import { hashToken } from "../utils/auth.utils";
import prisma from "../config/db";
import { AUTH, OTP } from "../utils/constants";
import { getAuthCookieOptions, getClearAuthCookieOptions } from "../utils/cookies";
import { safeUserSelect, sanitizeUser } from "../utils/user.select";

/** Best-effort client IP, honouring the trusted proxy chain. */
const clientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];
  return (
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown"
  );
};

const requestContext = (req: Request) => ({
  ipAddress: clientIp(req),
  userAgent: req.headers["user-agent"],
});

/** Shape returned to the browser for an in-flight OTP step. Never includes the code. */
const otpChallengePayload = (challenge: OtpChallenge) => ({
  challengeToken: challenge.challengeToken,
  maskedEmail: challenge.maskedEmail,
  expiresAt: challenge.expiresAt,
  resendAvailableAt: challenge.resendAvailableAt,
  codeLength: OTP.LENGTH,
  otpDelivered: challenge.delivered,
});

const otpErrorResponse = (res: Response, error: unknown) => {
  if (error instanceof OtpError || error instanceof LoginMethodError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }
  return res.status(400).json({
    success: false,
    message: error instanceof Error ? error.message : "Verification failed.",
  });
};

/**
 * Creates the session row + auth cookie for a user who has cleared every
 * authentication step. Shared by the OTP and break-glass sign-in paths.
 */
const establishSession = async (
  req: Request,
  res: Response,
  user: { id: string; email: string; name?: string | null },
  token: string,
) => {
  const userIp = clientIp(req);

  // Clean up any expired sessions for this user first.
  await prisma.session.deleteMany({
    where: { userId: user.id, expiresAt: { lte: new Date() } },
  });

  // Enforce a cap on concurrent sessions by evicting the oldest ones
  // (instead of hard-blocking the login, which locks users out).
  const activeSessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { loginTime: "asc" },
    select: { id: true },
  });
  if (activeSessions.length >= AUTH.MAX_SESSIONS) {
    const toRemove = activeSessions.slice(0, activeSessions.length - AUTH.MAX_SESSIONS + 1);
    await prisma.session.deleteMany({
      where: { id: { in: toRemove.map((s) => s.id) } },
    });
  }

  const newSession = await prisma.session.create({
    data: {
      userId: user.id,
      token: hashToken(token),
      ipAddress: String(userIp),
      userAgent: req.headers["user-agent"],
      expiresAt: new Date(Date.now() + AUTH.COOKIE_MAX_AGE_MS),
    },
  });

  if (process.env.SEND_LOGIN_NOTIFICATIONS === "true") {
    void sendLoginNotificationEmail(user.email, user.name || "User", {
      ipAddress: String(userIp),
      loginTime: new Date(),
    }).catch(() => undefined);
  }

  res.cookie(AUTH.COOKIE_NAME, token, getAuthCookieOptions());
  return newSession;
};

export const registerController = async (req: Request, res: Response) => {
  try {
    const { user, otp } = await registerUserService(req.body, req.file, requestContext(req));

    res.status(201).json({
      success: true,
      message: otp.delivered
        ? `We sent a ${OTP.LENGTH}-digit verification code to ${otp.maskedEmail}. Enter it to activate your account.`
        : "Your account was created, but we could not send the verification code. Please request a new one.",
      otpRequired: true,
      purpose: "REGISTRATION",
      ...otpChallengePayload(otp),
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong during registration.",
    });
  }
};

/**
 * Sign-in. Learners choose their method: `PASSWORD` completes here and sets the
 * cookie, `OTP` returns a challenge handle and finishes in `verifyOtpController`.
 * Staff accounts are password-only, enforced in `startOtpLoginService`.
 */
export const loginController = async (req: Request, res: Response) => {
  const { email, password, method } = req.body as {
    email: string;
    password?: string;
    method: LoginMethod;
  };

  try {
    if (method === "OTP") {
      if (!isLoginOtpEnabled()) {
        return res.status(503).json({
          success: false,
          message: "Code sign-in is unavailable right now. Please sign in with your password.",
          code: "OTP_LOGIN_DISABLED",
        });
      }

      const otp = await startOtpLoginService(email, requestContext(req));

      return res.status(200).json({
        success: true,
        message: otp.delivered
          ? `We sent a ${OTP.LENGTH}-digit sign-in code to ${otp.maskedEmail}.`
          : "We could not send your sign-in code. Please request a new one.",
        otpRequired: true,
        purpose: "LOGIN",
        ...otpChallengePayload(otp),
      });
    }

    const { user, token } = await loginUserService(email, password as string);
    const session = await establishSession(req, res, user, token);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      otpRequired: false,
      user,
      session: { id: session.id, expiresAt: session.expiresAt },
    });
  } catch (error) {
    if (error instanceof LoginMethodError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    return res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : "Invalid credentials.",
    });
  }
};

/**
 * Step 2 for both flows. A LOGIN challenge completes the sign-in and sets the
 * auth cookie; a REGISTRATION challenge activates the account and sends the
 * user to the sign-in screen.
 */
export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const { challengeToken, code } = req.body;
    const verified = await verifyOtpChallenge(challengeToken, code);

    if (verified.purpose === "REGISTRATION") {
      const message = await completeRegistrationOtpService(verified.userId);
      return res.status(200).json({
        success: true,
        message,
        purpose: "REGISTRATION",
        authenticated: false,
      });
    }

    const { user, token } = await completeOtpLoginService(verified.userId);
    const session = await establishSession(req, res, user, token);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      purpose: "LOGIN",
      authenticated: true,
      user,
      session: { id: session.id, expiresAt: session.expiresAt },
    });
  } catch (error) {
    return otpErrorResponse(res, error);
  }
};

/** Issues a replacement code for an in-flight challenge. */
export const resendOtpController = async (req: Request, res: Response) => {
  try {
    const challenge = await resendOtpChallenge(req.body.challengeToken);
    return res.status(200).json({
      success: true,
      message: `A new code is on its way to ${challenge.maskedEmail}.`,
      ...otpChallengePayload(challenge),
    });
  } catch (error) {
    return otpErrorResponse(res, error);
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing verification token.",
      });
    }

    const message = await verifyEmailService(token);

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Verification failed.",
    });
  }
};

export const resendVerificationEmailController = async (req: Request, res: Response) => {
  const verificationEmailEnabled = isVerificationEmailDeliveryEnabled();
  try {
    const message = await resendVerificationEmailService(req.body.email);
    return res.status(200).json({
      success: true,
      message,
      verificationEmailEnabled,
    });
  } catch {
    return res.status(200).json({
      success: true,
      message: verificationEmailEnabled
        ? "If an unverified account with that email exists, a new verification link has been sent."
        : "Email verification delivery is temporarily unavailable. You can sign in immediately without verifying.",
      verificationEmailEnabled,
    });
  }
};

export const logoutController = async (req: Request, res: Response) => {
  try {
    let token = req.cookies[AUTH.COOKIE_NAME];
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

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

export const verifyController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(200).json({ success: true, authenticated: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: safeUserSelect,
  });
  if (!user) {
    return res.status(200).json({ success: true, authenticated: false, user: null });
  }

  return res.status(200).json({ success: true, authenticated: true, user });
};

export const getMaintenanceStatus = async (req: Request, res: Response) => {
  try {
    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "isMaintenanceMode" },
    });
    const isMaintenanceMode = maintenanceSetting?.value === "true";
    res.status(200).json({ isMaintenanceMode });
  } catch (error) {
    res.status(500).json({ isMaintenanceMode: false, message: "Failed to retrieve status." });
  }
};
