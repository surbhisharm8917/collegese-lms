import { z } from "zod";
import { AUTH, OTP } from "./constants";
import { PROGRAMME_LIST } from "./programmes";

/**
 * Centralized Zod schemas for request validation.
 * Keep all auth-related input schemas here so validation rules stay consistent.
 */

const passwordSchema = z
  .string({ message: "Password is required." })
  .min(
    AUTH.PASSWORD_MIN_LENGTH,
    `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters long.`,
  )
  .max(
    AUTH.PASSWORD_MAX_LENGTH,
    `Password must be at most ${AUTH.PASSWORD_MAX_LENGTH} characters long.`,
  )
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

const emailSchema = z
  .string({ message: "Email is required." })
  .trim()
  .toLowerCase()
  .max(254, "Email address must be 254 characters or fewer.")
  .email("A valid email is required.");

// SECURITY: self-registration must NOT accept privileged fields (role, isVerified,
// etc.). Only the fields below are allowed; `.strict()` rejects any extra keys so a
// caller cannot smuggle `role: "SUPER_ADMIN"` or `isVerified: true` into the body.
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(120, "Name must be 120 characters or fewer."),
    email: emailSchema,
    password: passwordSchema,
    phone: z.string().trim().max(20, "Phone number must be 20 characters or fewer.").optional(),
    courseName: z.enum(PROGRAMME_LIST, {
      message: "Please select a valid programme.",
    }),
    bio: z.string().trim().max(1000).optional(),
    acceptTerms: z.literal(true, { message: "You must accept the Terms of Service." }),
    acceptPrivacy: z.literal(true, { message: "You must acknowledge the Privacy Policy." }),
    confirmAdult: z.literal(true, {
      message: "Public self-registration is available only to learners aged 18 or older.",
    }),
    website: z.string().max(0).optional(),
  })
  .strict();

export const adminCreateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    email: emailSchema,
    password: passwordSchema.optional(),
    role: z.enum(["STUDENT", "ASSISTANT", "TEACHER", "ADMIN", "SUPER_ADMIN"]).optional(),
    learnerId: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z
        .string()
        .trim()
        .min(3, "Learner ID must be at least 3 characters long.")
        .max(64, "Learner ID must be at most 64 characters long.")
        .regex(
          /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
          "Learner ID may contain only letters, numbers, hyphens, and underscores.",
        )
        .optional(),
    ),
    phone: z.string().trim().max(20).optional(),
    courseName: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.enum(PROGRAMME_LIST, { message: "Please select a valid programme." }).optional(),
    ),
    bio: z.string().trim().max(1000).optional(),
  })
  .strict();

// Two ways in: a password (the default, and the only option for staff) or a
// one-time code emailed to a learner. The password is required only for the
// former, so it is validated conditionally rather than up front.
export const loginSchema = z
  .object({
    email: emailSchema,
    method: z.enum(["PASSWORD", "OTP"]).default("PASSWORD"),
    password: z.string().optional(),
  })
  .refine((value) => value.method === "OTP" || Boolean(value.password), {
    message: "Password is required.",
    path: ["password"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resendVerificationSchema = forgotPasswordSchema;

// ─── Email one-time passcodes ────────────────────────────────
const challengeTokenSchema = z
  .string({ message: "Verification session is missing." })
  .trim()
  .regex(/^[a-f0-9]{32,128}$/i, "This verification session is no longer valid.");

export const verifyOtpSchema = z
  .object({
    challengeToken: challengeTokenSchema,
    // Digits only, and whitespace/hyphens are stripped first so a pasted
    // "123 456" from the email body still validates.
    code: z.preprocess(
      (value) => (typeof value === "string" ? value.replace(/[\s-]/g, "") : value),
      z
        .string({ message: "Enter the verification code." })
        .regex(
          new RegExp(`^\\d{${OTP.LENGTH}}$`),
          `Enter the ${OTP.LENGTH}-digit code from your email.`,
        ),
    ),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    challengeToken: challengeTokenSchema,
  })
  .strict();

export const supportTicketSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required.").max(120),
    email: emailSchema,
    phone: z.string().trim().max(20).optional(),
    category: z.enum(["ACCOUNT", "COURSE", "PAYMENT", "PRIVACY", "TECHNICAL", "OTHER"]),
    subject: z.string().trim().min(5, "Subject is required.").max(160),
    message: z.string().trim().min(20, "Please provide at least 20 characters.").max(5000),
    consentToContact: z.literal(true, { message: "Consent to contact is required." }),
    website: z.string().max(0).optional(),
  })
  .strict();

export const updateSupportTicketSchema = z
  .object({
    status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]),
    resolution: z.string().trim().max(5000).optional(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string({ message: "Reset token is required." }).min(1, "Reset token is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string({ message: "Password confirmation is required." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ message: "Current password is required." })
      .min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string({ message: "Password confirmation is required." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
const optionalDateString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "A valid date is required.")
    .optional(),
);

const optionalFormBoolean = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : value),
  z.boolean().optional(),
);

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO code.");

const priceSchema = z.coerce
  .number()
  .int("Price must be a whole number of paise.")
  .min(0, "Price cannot be negative.")
  .max(2_147_483_647, "Price is too large.");

export const createCourseSchema = z
  .object({
    title: z.string().trim().min(1, "Course title is required.").max(200),
    description: z.string().trim().max(5000).optional(),
    category: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(PROGRAMME_LIST, { message: "Please select a valid programme." }).optional(),
    ),
    priceInPaise: priceSchema.default(0),
    currency: currencySchema.default("INR"),
    startDate: optionalDateString,
    endDate: optionalDateString,
    isPublished: optionalFormBoolean,
  })
  .strict()
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(startDate).getTime() <= new Date(endDate).getTime(),
    { message: "End date must be on or after start date.", path: ["endDate"] },
  );

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(1, "Course title cannot be empty.").max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    category: z.preprocess(
      (value) => (value === "" ? null : value),
      z.enum(PROGRAMME_LIST, { message: "Please select a valid programme." }).nullable().optional(),
    ),
    priceInPaise: priceSchema.optional(),
    currency: currencySchema.optional(),
    startDate: optionalDateString,
    endDate: optionalDateString,
    isPublished: optionalFormBoolean,
    isActive: optionalFormBoolean,
  })
  .strict();

export const preparePaymentUploadSchema = z
  .object({
    courseId: z.string().trim().min(1, "Course is required."),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    fileSize: z.coerce
      .number()
      .int()
      .positive("Screenshot cannot be empty.")
      .max(10 * 1024 * 1024, "Screenshot must be 10MB or smaller."),
  })
  .strict();

export const submitPaymentRequestSchema = z
  .object({
    courseId: z.string().trim().min(1, "Course is required."),
    uploadReceipt: z.string().min(1, "Upload receipt is required."),
  })
  .strict();

export const rejectPaymentRequestSchema = z
  .object({
    reason: z.string().trim().min(3, "A short rejection reason is required.").max(500),
  })
  .strict();
