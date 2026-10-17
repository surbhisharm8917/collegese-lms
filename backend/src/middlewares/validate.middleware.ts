import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";

/**
 * Validation middleware factory.
 * Validates and (where applicable) sanitizes `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed/typed data.
 * On failure, returns a 400 with a concise validation message.
 *
 * Usage:
 *   router.post("/login", validateBody(loginSchema), loginController);
 */
export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: typeof issue.path[0] === "string" ? issue.path[0] : "_form",
          message: issue.message,
          code: issue.code,
        }));
        res.status(400).json({
          success: false,
          message: errors[0]?.message || "Please check the highlighted fields.",
          errors,
        });
        return;
      }
      res.status(400).json({ success: false, message: "Invalid request body." });
    }
  };
};
