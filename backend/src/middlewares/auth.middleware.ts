import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { hashToken } from "../utils/auth.utils";
import type { AuthUser } from "../types/express";
import { AUTH } from "../utils/constants";

const JWT_SECRET = process.env.JWT_SECRET as string;

type AuthenticationResult =
  | { user: AuthUser; status: 200; message?: never }
  | { user?: never; status: 401 | 403; message: string };

const tokenFromRequest = (req: Request): string | undefined => {
  const cookieToken = req.cookies?.[AUTH.COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
};

const authenticateRequest = async (req: Request): Promise<AuthenticationResult> => {
  const token = tokenFromRequest(req);
  if (!token) {
    return { status: 401, message: "Unauthorized: No token provided." };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as AuthUser;
    const session = await prisma.session.findFirst({
      where: {
        token: hashToken(token),
        userId: decoded.id,
        expiresAt: { gt: new Date() },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            forcePasswordChange: true,
            isSuspended: true,
            isDeleted: true,
          },
        },
      },
    });
    if (!session) {
      return { status: 401, message: "Unauthorized: Session expired or invalidated." };
    }
    if (session.user.isSuspended || session.user.isDeleted) {
      return { status: 403, message: "Account is suspended or deleted." };
    }
    return {
      status: 200,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        forcePasswordChange: session.user.forcePasswordChange,
      },
    };
  } catch {
    return { status: 401, message: "Unauthorized: Invalid token." };
  }
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const result = await authenticateRequest(req);
  if (!result.user) {
    return res.status(result.status).json({ success: false, message: result.message });
  }
  req.user = result.user;
  next();
};

/**
 * Resolves a session when one exists, but treats missing/expired credentials as
 * an anonymous request. This is only for public session-probe endpoints; all
 * protected routes continue to use authMiddleware.
 */
export const optionalAuthMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const result = await authenticateRequest(req);
  if (result.user) {
    req.user = result.user;
  }
  next();
};
