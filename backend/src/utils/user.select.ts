import { Prisma } from "@generated/prisma/client";

/**
 * User fields that are safe to return to the account owner or an administrator.
 * Authentication, reset, and verification secrets must never be selected into an API response.
 */
export const safeUserSelect = {
  id: true,
  name: true,
  learnerId: true,
  email: true,
  phone: true,
  profilePic: true,
  courseName: true,
  Gender: true,
  dateOfBirth: true,
  address: true,
  department: true,
  year: true,
  guardianPhone: true,
  attendancePercentage: true,
  grade: true,
  feedback: true,
  bio: true,
  role: true,
  completedCourse: true,
  isVerified: true,
  forcePasswordChange: true,
  isSuspended: true,
  isDeleted: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** Minimal identity projection for nested relations and public attribution. */
export const basicUserSelect = {
  id: true,
  name: true,
  email: true,
  profilePic: true,
  role: true,
} satisfies Prisma.UserSelect;

type SensitiveUserField =
  | "password"
  | "verificationToken"
  | "verificationTokenExpiresAt"
  | "passwordResetToken"
  | "passwordResetExpiresAt";

const SENSITIVE_USER_FIELDS = new Set<SensitiveUserField>([
  "password",
  "verificationToken",
  "verificationTokenExpiresAt",
  "passwordResetToken",
  "passwordResetExpiresAt",
]);

/** Defense-in-depth for legacy controller paths that already loaded a full User row. */
export const sanitizeUser = <T extends Record<string, unknown>>(
  user: T,
): Omit<T, SensitiveUserField> =>
  Object.fromEntries(
    Object.entries(user).filter(([key]) => !SENSITIVE_USER_FIELDS.has(key as SensitiveUserField)),
  ) as Omit<T, SensitiveUserField>;
