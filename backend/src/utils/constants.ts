/**
 * Centralized application constants.
 * All magic numbers, strings, and configuration values belong here.
 */

// ─── Authentication ──────────────────────────────────────────
export const AUTH = {
  MAX_SESSIONS: 4,
  JWT_EXPIRY: "1h",
  COOKIE_NAME: "auth_token",
  COOKIE_MAX_AGE_MS: 60 * 60 * 1000, // 1 hour
  PASSWORD_SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  RESET_TOKEN_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
  VERIFICATION_TOKEN_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  CSRF_COOKIE_NAME: "jecc_csrf",
  CSRF_TOKEN_EXPIRY_MS: 12 * 60 * 60 * 1000, // 12 hours
} as const;

// ─── Email one-time passcodes (registration + login) ─────────
export const OTP = {
  LENGTH: 6,
  EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  /// Wrong-code submissions allowed per challenge before it is burned.
  MAX_ATTEMPTS: 5,
  /// Minimum gap between "send me another code" requests.
  RESEND_COOLDOWN_MS: 45 * 1000,
  /// Total re-sends allowed on a single challenge.
  MAX_RESENDS: 4,
  /// Challenge handle returned to the browser (bytes of entropy).
  CHALLENGE_BYTES: 32,
} as const;

// ─── Pagination ──────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ─── File Uploads ────────────────────────────────────────────
export const UPLOAD = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100 MB (legacy through-backend multipart path)
  MAX_DIRECT_VIDEO_SIZE: 20 * 1024 * 1024 * 1024, // 20 GB via direct, chunked cloud upload
  // Direct cloud upload URLs (SAS / presigned PUT) and their matching upload
  // receipts must stay valid for the full duration of a large (multi-hour,
  // multi-GB) lecture upload, including on slower connections.
  DIRECT_UPLOAD_URL_TTL_SECONDS: 6 * 60 * 60, // 6 hours
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ],
} as const;

// ─── Rate Limiting ───────────────────────────────────────────
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 500, // general per-IP budget per window
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: 100, // auth router general budget (e.g. /verify, /logout)
  LOGIN_MAX_REQUESTS: 20, // strict limit for credential endpoints (login, forgot/reset password)
  // OTP submit/resend: higher than login because a single sign-in legitimately
  // costs several requests (type code, mistype, request a new code), but still
  // far below what a 10^6 code-space brute force would need.
  OTP_MAX_REQUESTS: 40,
  SUPPORT_MAX_REQUESTS: 10,
  STATUS_MAX_REQUESTS: 500, // lenient for read-only status / health checks
} as const;

// ─── S3 / CloudFront ────────────────────────────────────────
export const CLOUD = {
  PRESIGNED_URL_EXPIRY: 24 * 60 * 60, // 24 hours in seconds
  CLOUDFRONT_URL_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
} as const;

// ─── WebSocket / WebRTC ─────────────────────────────────────
export const SOCKET = {
  PING_TIMEOUT: 60000,
  PING_INTERVAL: 25000,
  CLEANUP_INTERVAL_MS: 15000,
} as const;

// ─── Cron ────────────────────────────────────────────────────
export const CRON = {
  ASSESSMENT_REMINDER: "0 * * * *", // every hour
} as const;

// ─── HTTP Status Codes (convenience aliases) ────────────────
export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── User Roles ──────────────────────────────────────────────
export const ROLES = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  ASSISTANT: "ASSISTANT",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
