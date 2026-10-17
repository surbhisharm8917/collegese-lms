import { Request, Response, NextFunction } from "express";
import prisma from "../../config/db";
import { logger } from "../../utils/logger";

// Short-lived in-memory cache to avoid hitting the DB on every authenticated request.
const CACHE_TTL_MS = 15 * 1000;
let cache: { isMaintenanceMode: boolean; allowedUsers: string[]; fetchedAt: number } | null = null;

const getMaintenanceState = async () => {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const [maintenanceSetting, whitelistSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "isMaintenanceMode" } }),
    prisma.systemSetting.findUnique({ where: { key: "maintenanceAllowedUsers" } }),
  ]);

  let allowedUsers: string[] = [];
  if (whitelistSetting?.value) {
    try {
      const parsedValue = JSON.parse(whitelistSetting.value);
      if (Array.isArray(parsedValue)) {
        allowedUsers = parsedValue.filter((id) => typeof id === "string");
      }
    } catch (e) {
      logger.error("Failed to parse whitelist from DB:", e);
    }
  }

  cache = {
    isMaintenanceMode: maintenanceSetting?.value === "true",
    allowedUsers,
    fetchedAt: now,
  };
  return cache;
};

export const maintenanceModeMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { isMaintenanceMode, allowedUsers } = await getMaintenanceState();

    if (!isMaintenanceMode) {
      return next();
    }

    const user = (req as any).user;
    const allowedRoles = ["SUPER_ADMIN", "ADMIN"];

    if (user?.role && allowedRoles.includes(user.role)) {
      return next();
    }

    if (user?.id && allowedUsers.includes(user.id)) {
      return next();
    }

    return res.status(503).json({
      success: false,
      message: "🔧 System is under maintenance. Please try again later.",
      maintenanceMode: true,
    });
  } catch (error) {
    logger.error("Maintenance middleware error:", error);
    next();
  }
};
