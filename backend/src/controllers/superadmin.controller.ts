import { Request, Response } from "express";
import prisma from "../config/db";
import { Role, SystemSetting } from "@generated/prisma/client";
import { NotificationService } from "../services/notification.service";
import { sendMaintenanceModeEmail, sendWhitelistUpdateEmail } from "@services/email.service";
import { logger } from "../utils/logger";

export const promoteUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as Record<string, string>;
    const { role } = req.body;
    const user = req.user!;

    if (!role || !Object.values(Role).includes(role)) {
      return res.status(400).json({ success: false, message: "A valid role is required." });
    }
    if (userId === user.id) {
      return res.status(400).json({ success: false, message: "You cannot change your own role." });
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    if (currentUser.role === role) {
      return res.status(400).json({
        success: false,
        message: `User already has the role ${role}.`,
      });
    }

    const oldRole = currentUser.role;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: { id: true, name: true, email: true, role: true },
    });
    await NotificationService.notifyRoleUpdate(
      userId,
      oldRole,
      role,
      user.email || "Super Administrator",
      {
        updatedById: user.id,
        updateDate: new Date().toISOString(),
        additionalPermissions: [`Promoted from ${oldRole} to ${role} by Super Administrator`],
      },
    );

    res.status(200).json({
      success: true,
      message: `User successfully promoted from ${oldRole} to ${role}. User has been notified.`,
      user: updatedUser,
    });
  } catch (error) {
    logger.error("Error promoting user:", error);
    res.status(500).json({ success: false, message: "Failed to promote user." });
  }
};

export const setSystemSettingsController = async (req: Request, res: Response) => {
  try {
    const settings: { [key: string]: string } = req.body;

    // Validate keys/values to prevent arbitrary settings injection.
    const ALLOWED_KEY = /^[a-zA-Z0-9_]{1,64}$/;
    const entries = Object.entries(settings || {});
    if (entries.length === 0 || entries.length > 50) {
      return res.status(400).json({ success: false, message: "Invalid settings payload." });
    }
    for (const [key, value] of entries) {
      if (!ALLOWED_KEY.test(key)) {
        return res.status(400).json({ success: false, message: `Invalid setting key: ${key}` });
      }
      if (!["string", "number", "boolean"].includes(typeof value)) {
        return res
          .status(400)
          .json({ success: false, message: `Invalid value for setting: ${key}` });
      }
    }

    const updateTransactions = entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    );
    await prisma.$transaction(updateTransactions);
    res.status(200).json({
      success: true,
      message: "System settings updated successfully.",
      settings,
    });
  } catch (error) {
    logger.error("Error updating system settings:", error);
    res.status(500).json({ success: false, message: "Failed to update systesm settings." });
  }
};

export const getSystemSettingsController = async (req: Request, res: Response) => {
  try {
    const settingsFromDb = await prisma.systemSetting.findMany();
    const settings = settingsFromDb.reduce(
      (acc: Record<string, string>, setting: SystemSetting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as { [key: string]: string },
    );

    res.status(200).json({
      success: true,
      message: "System settings retrieved successfully.",
      settings,
    });
  } catch (error) {
    logger.error("Error retrieving system settings:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve system settings." });
  }
};

export const getUsersController = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    logger.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users." });
  }
};

export const getAllExamScores = async (req: Request, res: Response) => {
  try {
    const requester = req.user!;
    const access =
      requester.role === Role.ADMIN || requester.role === Role.SUPER_ADMIN
        ? {}
        : requester.role === Role.TEACHER
          ? { exam: { course: { teachers: { some: { teacherId: requester.id } } } } }
          : { exam: { course: { assistants: { some: { assistantId: requester.id } } } } };
    const scores = await prisma.examAttempt.findMany({
      where: access,
      select: {
        id: true,
        examId: true,
        userId: true,
        score: true,
        isPassed: true,
        completedAt: true,
        videoRecordingKey: true,
        exam: {
          select: {
            id: true,
            title: true,
            totalMarks: true,
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                isActive: true,
                isPublished: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            learnerId: true,
            year: true,
            department: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    if (!scores.length) {
      return res.status(404).json({ message: "No exam scores found" });
    }

    res.json({ total: scores.length, scores });
  } catch (error: any) {
    logger.error("Error fetching all exam scores:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleMaintenanceMode = async (req: Request, res: Response) => {
  try {
    const { isMaintenanceMode, reason } = req.body;
    if (typeof isMaintenanceMode !== "boolean") {
      return res.status(400).json({ message: "Invalid value for maintenance mode." });
    }
    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: "isMaintenanceMode" },
      update: { value: String(isMaintenanceMode) },
      create: { key: "isMaintenanceMode", value: String(isMaintenanceMode) },
    });
    const usersToNotify = await prisma.user.findMany({
      where: {
        OR: [{ role: "ADMIN" }, { role: "SUPER_ADMIN" }, { role: "TEACHER" }, { role: "STUDENT" }],
      },
      select: {
        email: true,
        name: true,
        role: true,
      },
    });
    const emailPromises = usersToNotify.map((user) => {
      if (user.email) {
        return sendMaintenanceModeEmail(
          user.email,
          user.name || "User",
          user.role,
          isMaintenanceMode,
          reason || "No reason provided.",
        );
      }
      return Promise.resolve();
    });
    Promise.allSettled(emailPromises).catch(() => {});
    res.status(200).json({
      success: true,
      message: `Maintenance mode is now ${isMaintenanceMode ? "enabled" : "disabled"}.`,
      setting: updatedSetting,
    });
  } catch (error) {
    logger.error("Toggle maintenance error:", error);
    res.status(500).json({ message: "Failed to update maintenance mode." });
  }
};

export const updateMaintenanceWhitelist = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        message: "Invalid value for whitelist. Must be an array of user IDs.",
      });
    }
    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: "maintenanceAllowedUsers" },
      update: { value: JSON.stringify(userIds) },
      create: { key: "maintenanceAllowedUsers", value: JSON.stringify(userIds) },
    });
    const whitelistedUsers = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        name: true,
      },
    });
    const whitelistUserNames = whitelistedUsers.map((user) => user.name);
    const adminUsers = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      select: {
        email: true,
        name: true,
      },
    });
    const emailPromises = adminUsers.map((admin) => {
      if (admin.email) {
        return sendWhitelistUpdateEmail(
          admin.email,
          admin.name || "Administrator",
          whitelistUserNames,
        );
      }
      return Promise.resolve();
    });
    Promise.allSettled(emailPromises).catch(() => {});
    res.status(200).json({
      success: true,
      message: "Whitelist updated successfully.",
      setting: updatedSetting,
    });
  } catch (error) {
    logger.error("Update whitelist error:", error);
    res.status(500).json({ message: "Failed to update whitelist." });
  }
};
