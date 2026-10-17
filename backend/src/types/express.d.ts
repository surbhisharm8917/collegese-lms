/**
 * Centralized Express type augmentations.
 * This module extends the Express Request interface to include
 * the authenticated user object injected by authMiddleware.
 */

export interface AuthUser {
  id: string;
  email: string;
  role: "STUDENT" | "ADMIN" | "TEACHER" | "ASSISTANT" | "SUPER_ADMIN";
  forcePasswordChange: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId: string;
    }
  }
}

// Override Express 5 ParamsDictionary to use string instead of string | string[]
// since this project does not use array route parameters
declare module "express-serve-static-core" {
  interface ParamsDictionary {
    [key: string]: string;
  }
}
