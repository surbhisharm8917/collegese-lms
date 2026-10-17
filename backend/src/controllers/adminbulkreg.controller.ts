import { Request, Response } from "express";
import * as XLSX from "xlsx";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { logger } from "../utils/logger";
import { generateLearnerId, hashToken } from "../utils/auth.utils";
import { sendAccountInvitationEmail } from "../services/email.service";
import { AUTH } from "../utils/constants";
import { Role } from "@generated/prisma/client";

export const bulkRegisterUsers = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const usersData = XLSX.utils.sheet_to_json(worksheet);
    if (usersData.length > 500) {
      return res.status(400).json({ message: "A bulk import can contain at most 500 users." });
    }

    const registeredUsers: string[] = [];
    const skippedUsers: string[] = [];
    const failedEmails: { email: string; error: string }[] = [];

    for (const userData of usersData as any[]) {
      const {
        email,
        name,
        role,
        phone,
        courseName,
        Gender,
        dateOfBirth,
        address,
        department,
        year,
        guardianPhone,
        attendancePercentage,
        grade,
        feedback,
      } = userData;

      if (!email || !name) {
        skippedUsers.push(JSON.stringify(userData));
        continue;
      }

      try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
          skippedUsers.push(email);
          continue;
        }

        const password = `${crypto.randomBytes(12).toString("base64url")}Aa1`;
        const hashedPassword = await bcrypt.hash(password, AUTH.PASSWORD_SALT_ROUNDS);
        const learnerId = generateLearnerId();
        const invitationToken = crypto.randomBytes(32).toString("hex");
        const invitationExpiresAt = new Date(Date.now() + AUTH.VERIFICATION_TOKEN_EXPIRY_MS);
        const requestedRole = String(role || Role.STUDENT).toUpperCase() as Role;
        const allowedRoles =
          req.user?.role === Role.SUPER_ADMIN
            ? Object.values(Role)
            : [Role.STUDENT, Role.ASSISTANT, Role.TEACHER];
        if (!allowedRoles.includes(requestedRole)) {
          throw new Error(`You are not allowed to create the ${requestedRole} role.`);
        }

        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: String(name).trim(),
            learnerId: learnerId,
            password: hashedPassword,
            forcePasswordChange: true,
            isVerified: false,
            passwordResetToken: hashToken(invitationToken),
            passwordResetExpiresAt: invitationExpiresAt,
            role: requestedRole,
            phone,
            courseName,
            Gender,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            address,
            department,
            year: year ? parseInt(year) : undefined,
            guardianPhone,
            attendancePercentage: attendancePercentage ? parseFloat(attendancePercentage) : 0,
            grade,
            feedback,
          },
        });

        const course = courseName
          ? await prisma.course.findFirst({
              where: {
                title: {
                  contains: String(courseName),
                  mode: "insensitive",
                },
                isDeleted: false,
                isActive: true,
              },
            })
          : null;

        if (course) {
          await prisma.courseEnrollment.upsert({
            where: { userId_courseId: { userId: newUser.id, courseId: course.id } },
            create: {
              userId: newUser.id,
              courseId: course.id,
            },
            update: {},
          });
        } else if (courseName) {
          logger.warn(`Course not found for: ${courseName}`);
        }

        await sendAccountInvitationEmail(
          normalizedEmail,
          String(name),
          invitationToken,
          requestedRole,
        );

        registeredUsers.push(normalizedEmail);
      } catch (userError: any) {
        failedEmails.push({
          email: email || "Unknown Email",
          error: userError.message || "Unknown Error",
        });
      }
    }

    return res.status(200).json({
      message: "Bulk registration completed.",
      summary: {
        totalProcessed: usersData.length,
        registeredCount: registeredUsers.length,
        skippedCount: skippedUsers.length,
        failedEmailCount: failedEmails.length,
      },
      details: {
        registeredUsers,
        skippedUsers,
        failedEmails,
        // Compatibility aliases consumed by the current dashboard.
        registered: registeredUsers,
        skipped: skippedUsers,
        failed: failedEmails,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal server error during bulk registration.",
      error: error.message,
    });
  }
};
