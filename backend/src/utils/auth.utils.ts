import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { AUTH } from "./constants";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables.");
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(AUTH.PASSWORD_SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: AUTH.JWT_EXPIRY, algorithm: "HS256" });
};

/**
 * Deterministically hashes a session token (or any opaque token) so the
 * raw value is never persisted. Used to store/lookup sessions without
 * exposing usable tokens if the database is ever leaked.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Validates password strength. Returns an error message if invalid, or null if valid.
 * Requires min 8 chars with at least one lowercase, one uppercase, and one digit.
 */
export const validatePasswordStrength = (password: unknown): string | null => {
  if (typeof password !== "string" || password.length < AUTH.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (password.length > AUTH.PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${AUTH.PASSWORD_MAX_LENGTH} characters long.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null;
};

export const generateLearnerId = (): string => {
  const prefix = "JECA-";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const charactersLength = characters.length;
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    result += characters[bytes[i] % charactersLength];
  }
  return `${prefix}${result}`;
};
