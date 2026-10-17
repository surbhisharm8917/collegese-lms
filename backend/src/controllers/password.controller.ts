import { Request, Response } from "express";
import {
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
} from "@services/password.service";
import { AUTH } from "../utils/constants";
import { getClearAuthCookieOptions } from "../utils/cookies";

export const forgotPasswordController = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const message = await forgotPasswordService(email);
    res.status(200).json({ success: true, message });
  } catch (error) {
    res.status(400).json({ success: false, message: "Password reset failed." });
  }
};

export const changePasswordController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized: No user data found." });
  }
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user.id;
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match." });
  }
  try {
    const message = await changePasswordService(userId, currentPassword, newPassword);
    res.clearCookie(AUTH.COOKIE_NAME, getClearAuthCookieOptions());
    res.status(200).json({ success: true, message });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to change password.",
    });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match." });
  }

  try {
    const message = await resetPasswordService(token, newPassword);
    res.clearCookie(AUTH.COOKIE_NAME, getClearAuthCookieOptions());
    res.status(200).json({ success: true, message });
  } catch (error) {
    res.status(400).json({ success: false, message: "Password reset failed." });
  }
};
