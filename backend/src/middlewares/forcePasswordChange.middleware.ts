import { Request, Response, NextFunction } from "express";

const PASSWORD_CHANGE_WHITELIST = ["/api/v1/auth/change-password", "/api/v1/auth/logout"];

export const forcePasswordChangeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.forcePasswordChange) {
    if (PASSWORD_CHANGE_WHITELIST.some((path) => req.path.endsWith(path))) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Password change required before accessing other resources.",
      forcePasswordChange: true,
    });
  }
  next();
};
