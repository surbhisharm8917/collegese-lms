import prisma from "../config/db";
import { logger } from "../utils/logger";
import {
  hashPassword,
  comparePassword,
  generateToken,
  hashToken,
  generateLearnerId,
} from "../utils/auth.utils";
import { Prisma, Role } from "@generated/prisma/client";
import { uploadPublicFileToS3 } from "../utils/s3.utils";
import crypto from "crypto";
import { AUTH } from "../utils/constants";
import { sanitizeUser } from "../utils/user.select";
import { sendVerificationEmail } from "./email.service";
import { issueOtpChallenge, type OtpChallenge } from "./otp.service";

export const isVerificationEmailDeliveryEnabled = () =>
  process.env.SEND_VERIFICATION_EMAILS === "true";

/** Request metadata recorded against an OTP challenge for audit purposes. */
export type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

/**
 * How a user asked to prove who they are on the sign-in screen.
 * `PASSWORD` is the default and is the only method staff accounts may use.
 */
export type LoginMethod = "PASSWORD" | "OTP";

/**
 * Only learners may sign in with an emailed code. Staff accounts (admin, super
 * admin, teacher, assistant) are password-only on purpose: a code-only path
 * would make read access to a mailbox sufficient to reach a privileged
 * dashboard, and those accounts are provisioned by an admin rather than
 * self-registered, so there is no mailbox-confirmation step to build on.
 */
export const isOtpLoginAllowedForRole = (role: Role): boolean => role === Role.STUDENT;

export const registerUserService = async (
  userData: Prisma.UserCreateInput,
  profilePicFile: Express.Multer.File | undefined,
  context: RequestContext = {},
) => {
  // SECURITY: only trust an explicit allowlist of fields from the request body.
  // role/isVerified/forcePasswordChange must NEVER be settable at self-registration.
  const {
    name,
    email,
    password,
    phone,
    courseName,
    bio,
    acceptTerms,
    acceptPrivacy,
    confirmAdult,
  } = userData as {
    name: string;
    email: string;
    password: string;
    phone?: string;
    courseName?: string;
    bio?: string;
    acceptTerms: true;
    acceptPrivacy: true;
    confirmAdult: true;
  };

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new Error("Email already registered.");
  }

  let profilePicUrl: string | undefined = undefined;
  if (profilePicFile) {
    try {
      profilePicUrl = await uploadPublicFileToS3(
        profilePicFile.buffer,
        profilePicFile.mimetype,
        `profile-pics/${Date.now()}-${profilePicFile.originalname}`,
      );
    } catch (error) {
      logger.error("Failed to upload profile picture to S3:", error);
      throw new Error("Failed to upload profile picture.");
    }
  }

  const hashedPassword = await hashPassword(password);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const learnerId = generateLearnerId();

  const newUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      courseName,
      bio,
      role: "STUDENT",
      isVerified: false,
      forcePasswordChange: false,
      termsAcceptedAt: acceptTerms ? new Date() : null,
      privacyAcceptedAt: acceptPrivacy ? new Date() : null,
      adultConfirmedAt: confirmAdult ? new Date() : null,
      profilePic: profilePicUrl,
      learnerId: learnerId,
      // Store only the hash of the verification token so a DB leak cannot be used
      // to verify/hijack accounts. The raw token is emailed to the user.
      verificationToken: hashToken(verificationToken),
      verificationTokenExpiresAt: new Date(Date.now() + AUTH.VERIFICATION_TOKEN_EXPIRY_MS),
    },
  });

  // Confirmation is done with a six digit code rather than a magic link: it
  // keeps the user on the tab they are already in, and works when the mail
  // client rewrites or strips links. The hashed link token above is retained so
  // the legacy /verify-email fallback still works for anyone who loses the tab.
  const otp = await issueOtpChallenge({
    userId: newUser.id,
    email: normalizedEmail,
    name: newUser.name,
    purpose: "REGISTRATION",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return { user: newUser, otp };
};

/** Verifies email + password only. Deliberately does NOT mint a session. */
export const verifyCredentialsService = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error("Invalid email or password.");
  }

  if (user.isSuspended) {
    throw new Error("Your account has been suspended. Please contact the administrator.");
  }

  if (user.isDeleted) {
    throw new Error("This account no longer exists.");
  }

  return user;
};

/** Mints the signed session JWT for a fully authenticated user. */
export const issueAuthToken = (user: {
  id: string;
  email: string;
  role: string;
  forcePasswordChange: boolean;
}): string =>
  generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  });

/** Raised when a user picks a sign-in method their account may not use. */
export class LoginMethodError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = "LOGIN_METHOD_UNAVAILABLE",
  ) {
    super(message);
    this.name = "LoginMethodError";
  }
}

/**
 * Starts the emailed-code sign-in a learner chose instead of typing a password:
 * no password is supplied here, so possession of the mailbox is what proves
 * identity. Students only — see `isOtpLoginAllowedForRole`.
 */
export const startOtpLoginService = async (
  email: string,
  context: RequestContext = {},
): Promise<OtpChallenge> => {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  // A single message covers "no such account", "staff account", and "account
  // closed". Because no password was supplied, a more specific answer here
  // would turn this endpoint into an oracle for which addresses are
  // registered, privileged, or suspended.
  if (!user || !isOtpLoginAllowedForRole(user.role) || user.isSuspended || user.isDeleted) {
    throw new LoginMethodError(
      "Signing in with an emailed code is not available for this account. Please sign in with your password.",
      400,
      "OTP_LOGIN_NOT_AVAILABLE",
    );
  }

  return issueOtpChallenge({
    userId: user.id,
    email: user.email,
    name: user.name,
    purpose: "LOGIN",
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
};

/**
 * Loads the user behind a completed OTP challenge and mints their session token.
 * Passing the emailed code proves control of the address, so an account that was
 * never confirmed becomes verified here too.
 */
export const completeOtpLoginService = async (userId: string) => {
  const existing = await prisma.user.findUnique({ where: { id: userId } });

  if (!existing || existing.isDeleted) {
    throw new Error("This account no longer exists.");
  }
  if (existing.isSuspended) {
    throw new Error("Your account has been suspended. Please contact the administrator.");
  }
  // Re-checked at redemption, not just at issue: if the account was promoted to
  // a staff role while the code was in flight, that code must not mint a
  // privileged session.
  if (!isOtpLoginAllowedForRole(existing.role)) {
    throw new LoginMethodError(
      "This account must sign in with a password.",
      403,
      "OTP_LOGIN_NOT_AVAILABLE",
    );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      lastLogin: new Date(),
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  });

  return { user: sanitizeUser(user), token: issueAuthToken(user) };
};

/**
 * Marks an account confirmed after the sign-up code was accepted. No session is
 * created here: the user still signs in normally, which issues its own code.
 */
export const completeRegistrationOtpService = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  });

  return "Email verified successfully. You can sign in now.";
};

/**
 * Password sign-in. This is the only method available to staff accounts and the
 * default for learners, who may swap it for an emailed code.
 */
export const loginUserService = async (email: string, password: string) => {
  const verified = await verifyCredentialsService(email, password);

  const user = await prisma.user.update({
    where: { id: verified.id },
    data: { lastLogin: new Date() },
  });

  return { user: sanitizeUser(user), token: issueAuthToken(user) };
};

export const verifyEmailService = async (token: string) => {
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: {
          verificationToken: hashToken(token),
          verificationTokenExpiresAt: { gt: new Date() },
        },
      });

      if (!user) {
        throw new Error("Invalid or expired verification token.");
      }

      if (user.isVerified) {
        throw new Error("Email is already verified.");
      }

      await tx.user.update({
        where: {
          id: user.id,
          verificationToken: hashToken(token),
        },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
    });

    return "Email verified successfully!";
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("This verification link has already been used.");
    }

    if (
      error.message?.includes("Invalid or expired") ||
      error.message?.includes("already verified")
    ) {
      throw error;
    }

    throw new Error("Verification failed.");
  }
};

export const resendVerificationEmailService = async (email: string) => {
  const genericMessage =
    "If an unverified account with that email exists, a new verification link has been sent.";
  if (!isVerificationEmailDeliveryEnabled()) {
    return "Email verification delivery is temporarily unavailable. You can sign in immediately without verifying.";
  }
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, isVerified: true, isDeleted: true, isSuspended: true },
  });

  if (!user || user.isVerified || user.isDeleted || user.isSuspended) {
    return genericMessage;
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: hashToken(verificationToken),
      verificationTokenExpiresAt: new Date(Date.now() + AUTH.VERIFICATION_TOKEN_EXPIRY_MS),
    },
  });

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    logger.error("Failed to resend verification email:", error);
  }

  return genericMessage;
};
