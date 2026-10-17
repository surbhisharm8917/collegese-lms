import { Request, Response } from "express";
import prisma from "../config/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateLearnerId, hashToken, validatePasswordStrength } from "../utils/auth.utils";
import { sendAccountInvitationEmail, sendVerificationEmail } from "../services/email.service";
import { Prisma, Role } from "@generated/prisma/client";
import { logger } from "../utils/logger";
import { AUTH } from "../utils/constants";
import { basicUserSelect, safeUserSelect, sanitizeUser } from "../utils/user.select";

interface AdminCreateUserInput {
  email: string;
  password?: string;
  name: string;
  role?: Role;
  learnerId?: string;
  phone?: string;
  courseName?: string;
  bio?: string;
}

class UserCreationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
  }
}

const rolesAllowedForAdmin = [Role.STUDENT, Role.ASSISTANT, Role.TEACHER];
const rolesAllowedForSuperAdmin = [
  Role.STUDENT,
  Role.ASSISTANT,
  Role.TEACHER,
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

export const createUserHandler = async (userData: AdminCreateUserInput, actorRole: Role) => {
  const { email, password, name, role, phone, courseName, bio } = userData;
  const isSuperAdminProvisioning = actorRole === Role.SUPER_ADMIN;

  if (!email || !name) {
    throw new UserCreationError("Email and name are required.");
  }
  if (isSuperAdminProvisioning && !password) {
    throw new UserCreationError("Password is required when a Super Admin creates a user.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const requestedRole = String(role || Role.STUDENT).toUpperCase() as Role;
  const allowedRoles = isSuperAdminProvisioning ? rolesAllowedForSuperAdmin : rolesAllowedForAdmin;

  if (!allowedRoles.includes(requestedRole)) {
    throw new UserCreationError("You are not allowed to create a user with that role.");
  }

  if (password) {
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      throw new UserCreationError(passwordError);
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    throw new UserCreationError("User with this email already exists.", 409);
  }

  const customLearnerId =
    isSuperAdminProvisioning && userData.learnerId
      ? userData.learnerId.trim().toUpperCase()
      : undefined;
  if (customLearnerId) {
    const existingLearnerId = await prisma.user.findUnique({
      where: { learnerId: customLearnerId },
      select: { id: true },
    });
    if (existingLearnerId) {
      throw new UserCreationError("User with this learner ID already exists.", 409);
    }
  }

  const credentialPassword = password || `${crypto.randomBytes(12).toString("base64url")}Aa1`;
  const hashedPassword = await bcrypt.hash(credentialPassword, AUTH.PASSWORD_SALT_ROUNDS);
  const learnerId = customLearnerId || generateLearnerId();
  const accountToken = crypto.randomBytes(32).toString("hex");
  const accountTokenExpiresAt = new Date(Date.now() + AUTH.VERIFICATION_TOKEN_EXPIRY_MS);

  let newUser;
  try {
    newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        role: requestedRole,
        password: hashedPassword,
        learnerId,
        phone: phone || undefined,
        courseName: courseName || undefined,
        bio: bio || undefined,
        isVerified: false,
        forcePasswordChange: !isSuperAdminProvisioning,
        verificationToken: isSuperAdminProvisioning ? hashToken(accountToken) : null,
        verificationTokenExpiresAt: isSuperAdminProvisioning ? accountTokenExpiresAt : null,
        passwordResetToken: isSuperAdminProvisioning ? null : hashToken(accountToken),
        passwordResetExpiresAt: isSuperAdminProvisioning ? null : accountTokenExpiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target || "");
      if (target.includes("learnerId")) {
        throw new UserCreationError("User with this learner ID already exists.", 409);
      }
      throw new UserCreationError("User with this email already exists.", 409);
    }
    throw error;
  }

  try {
    if (isSuperAdminProvisioning) {
      await sendVerificationEmail(newUser.email, accountToken);
    } else {
      await sendAccountInvitationEmail(newUser.email, newUser.name, accountToken, newUser.role);
    }
  } catch (error) {
    logger.error(
      isSuperAdminProvisioning
        ? "User was created but the verification email could not be sent:"
        : "User was created but the invitation email could not be sent:",
      error,
    );
  }

  return { user: newUser, immediateAccess: isSuperAdminProvisioning };
};

export const createUserController = async (req: Request, res: Response) => {
  try {
    const result = await createUserHandler(req.body, req.user!.role as Role);
    res.status(201).json({
      success: true,
      message: result.immediateAccess
        ? "User created successfully. They can sign in immediately; email verification remains available."
        : "User created. An account setup link was sent by email.",
      user: sanitizeUser(result.user),
    });
  } catch (error) {
    res.status(error instanceof UserCreationError ? error.statusCode : 400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create user.",
    });
  }
};

export const getAllUsersController = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        learnerId: true,
        phone: true,
        role: true,
        Gender: true,
        department: true,
        year: true,
        isSuspended: true,
        isVerified: true,
        isDeleted: true,
        profilePic: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    logger.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users." });
  }
};

export const getUserByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        learnerId: true,
        role: true,
        isSuspended: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch user." });
  }
};

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Whitelist allowed fields to prevent privilege escalation
    const ALLOWED_FIELDS = [
      "name",
      "phone",
      "Gender",
      "dateOfBirth",
      "address",
      "department",
      "year",
      "guardianPhone",
      "bio",
      "courseName",
      "profilePic",
    ] as const;
    const updateData: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // Only SUPER_ADMIN can change role and suspension status
    if (currentUser?.role === "SUPER_ADMIN") {
      if (req.body.role !== undefined) {
        const VALID_ROLES = ["STUDENT", "ASSISTANT", "TEACHER", "ADMIN", "SUPER_ADMIN"];
        if (!VALID_ROLES.includes(req.body.role)) {
          return res.status(400).json({ success: false, message: "Invalid role value." });
        }
        updateData.role = req.body.role;
      }
      if (req.body.isSuspended !== undefined) {
        updateData.isSuspended = req.body.isSuspended;
      }
    }

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      if (isNaN(updateData.dateOfBirth.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD.",
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user.",
    });
  }
};

export const deleteUserController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user?.id) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot delete your own account." });
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          isDeleted: true,
          isSuspended: true,
        },
      }),
      prisma.session.deleteMany({ where: { userId: id } }),
    ]);

    res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete user." });
  }
};

export const getAllSessionsController = async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        loginTime: "desc",
      },
    });

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    logger.error("Error fetching sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve all sessions.",
    });
  }
};

export const getAdminEnrollmentsController = async (req: Request, res: Response) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      include: {
        course: true,
        user: { select: safeUserSelect },
      },
    });

    res.status(200).json({
      success: true,
      enrollments,
    });
  } catch (error) {
    logger.error("❌ Error fetching all enrollments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all enrollments.",
    });
  }
};

export const assignTeacherToCourseController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { teacherId } = req.body;
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: Role.TEACHER, isDeleted: false, isSuspended: false },
      select: basicUserSelect,
    });
    if (!teacher) {
      return res.status(400).json({ success: false, message: "Active teacher not found." });
    }
    const course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
      select: { id: true },
    });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }
    const existingAssignment = await prisma.courseTeacher.findFirst({
      where: { courseId, teacherId },
    });
    if (existingAssignment) {
      return res
        .status(400)
        .json({ success: false, message: "Teacher is already assigned to this course." });
    }
    await prisma.courseTeacher.create({
      data: {
        courseId,
        teacherId,
      },
    });
    res.status(200).json({ success: true, message: "Teacher assigned successfully." });
  } catch (error) {
    logger.error("Failed to assign teacher:", error);
    res.status(500).json({ success: false, message: "Failed to assign teacher." });
  }
};

export const findUserByEmailController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "An error occurred while searching for the user." });
  }
};

export const getAssignedTeachersController = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const assignments = await prisma.courseTeacher.findMany({
      where: { courseId: courseId },
      select: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!assignments) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found or no teachers assigned." });
    }
    const teachers = assignments.map((assignment: { teacher: any }) => assignment.teacher);

    res.status(200).json({ success: true, teachers: teachers });
  } catch (error) {
    logger.error("Failed to fetch assigned teachers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch assigned teachers." });
  }
};
