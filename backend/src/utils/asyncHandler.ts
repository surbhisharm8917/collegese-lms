/**
 * Async handler wrapper — eliminates try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get("/users", asyncHandler(async (req, res) => {
 *     const users = await prisma.user.findMany();
 *     res.json({ success: true, data: users });
 *   }));
 *
 * Any thrown error (including AppError) is automatically forwarded to
 * the global error handler via next(error).
 */
import { Request, Response, NextFunction } from "express";

type AsyncHandlerFn = (req: Request, res: Response, next: NextFunction) => Promise<void | Response>;

export const asyncHandler = (fn: AsyncHandlerFn) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
