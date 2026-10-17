import { Router } from "express";
import {
  createSupportTicket,
  getPublicSupportTicketStatus,
  listSupportTickets,
  updateSupportTicket,
} from "../controllers/support.controller";
import { isAdmin } from "../middlewares/adminAuth/admin.auth.middleware";
import { supportLimiter } from "../middlewares/security.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { supportTicketSchema, updateSupportTicketSchema } from "../utils/validation.schemas";

export const publicSupportRouter = Router();
publicSupportRouter.post(
  "/tickets",
  supportLimiter,
  validateBody(supportTicketSchema),
  createSupportTicket,
);
publicSupportRouter.get("/tickets/:reference/status", supportLimiter, getPublicSupportTicketStatus);

export const protectedSupportRouter = Router();
protectedSupportRouter.use(isAdmin);
protectedSupportRouter.get("/tickets", listSupportTickets);
protectedSupportRouter.patch(
  "/tickets/:ticketId",
  validateBody(updateSupportTicketSchema),
  updateSupportTicket,
);
