import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "./email.service";
import prisma from "../config/db";
import { AUTH } from "../utils/constants";
import { hashToken, validatePasswordStrength } from "../utils/auth.utils";

export const forgotPasswordService = async (email: string) => {
  const genericMessage =
    "If an account with that email exists, a password reset link has been sent.";

  const user = await prisma.user.findUnique({
    where: { email },
  });
  // Do not reveal whether the email is registered (prevents user enumeration).
  if (!user) {
    return genericMessage;
  }
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 3600000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      // Store only the hash; the raw token is emailed to the user.
      passwordResetToken: hashToken(resetToken),
      passwordResetExpiresAt: resetExpires,
    },
  });
  await sendPasswordResetEmail(user.email, resetToken);
  return genericMessage;
};

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found.");
  }

  // Re-authenticate: the caller must prove they know the current password.
  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentValid) {
    throw new Error("Current password is incorrect.");
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    throw new Error(strengthError);
  }

  const isSameAsOld = await bcrypt.compare(newPassword, user.password);
  if (isSameAsOld) {
    throw new Error("New password must be different from the current password.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, AUTH.PASSWORD_SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forcePasswordChange: false,
      },
    }),
    // Password changes invalidate every active device. The caller must sign in again.
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  return "Password has been changed successfully!";
};

export const resetPasswordService = async (token: string, newPassword: string) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashToken(token),
      passwordResetExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new Error("Invalid or expired token.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, AUTH.PASSWORD_SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        isVerified: true,
        forcePasswordChange: false,
      },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  return "Password has been reset successfully.";
};
