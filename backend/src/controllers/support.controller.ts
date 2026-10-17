import crypto from "crypto";
import type { Request, Response } from "express";
import prisma from "../config/db";
import {
  sendSupportTicketCreatedEmails,
  sendSupportTicketStatusEmail,
} from "../services/email.service";
import { logger } from "../utils/logger";

const createReference = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `JECA-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, category, subject, message } = req.body;
    const ticket = await prisma.supportTicket.create({
      data: {
        reference: createReference(),
        name,
        email: String(email).trim().toLowerCase(),
        phone: phone || null,
        category,
        subject,
        message,
      },
    });

    void sendSupportTicketCreatedEmails(ticket).catch((error) => {
      logger.error("Support ticket email delivery failed", error, { reference: ticket.reference });
    });

    return res.status(201).json({
      success: true,
      message: "Your request has been recorded.",
      ticket: {
        reference: ticket.reference,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    logger.error("Support ticket creation failed", error);
    return res.status(500).json({
      success: false,
      message: "We could not record your request. Please contact support by email.",
    });
  }
};

export const getPublicSupportTicketStatus = async (req: Request, res: Response) => {
  const reference = String(req.params.reference || "")
    .trim()
    .toUpperCase();
  const email = String(req.query.email || "")
    .trim()
    .toLowerCase();
  if (!reference || !email) {
    return res.status(400).json({ success: false, message: "Reference and email are required." });
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { reference, email },
    select: {
      reference: true,
      category: true,
      subject: true,
      status: true,
      resolution: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
    },
  });
  if (!ticket) {
    return res.status(404).json({ success: false, message: "Request not found." });
  }
  return res.status(200).json({ success: true, ticket });
};

export const listSupportTickets = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where = {
    ...(status && status !== "ALL" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { subject: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [tickets, total] = await prisma.$transaction([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return res.status(200).json({
    success: true,
    tickets,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
};

export const updateSupportTicket = async (req: Request, res: Response) => {
  try {
    const { status, resolution } = req.body;
    const closed = status === "RESOLVED" || status === "CLOSED";
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.ticketId },
      data: {
        status,
        resolution: resolution || null,
        resolvedById: closed ? req.user?.id : null,
        resolvedAt: closed ? new Date() : null,
      },
    });
    void sendSupportTicketStatusEmail(ticket).catch((error) => {
      logger.error("Support status email delivery failed", error, { reference: ticket.reference });
    });
    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    logger.error("Support ticket update failed", error);
    return res.status(404).json({ success: false, message: "Support request not found." });
  }
};
