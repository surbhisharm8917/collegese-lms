/**
 * Global error handling middleware.
 * Must be registered LAST with `app.use(globalErrorHandler)` in server.ts.
 *
 * Catches all errors passed via `next(error)` or thrown in async handlers
 * and returns a consistent JSON error response.
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

export const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Default to 500 if not an AppError
  let statusCode = 500;
  let message = "Internal server error";
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  } else if (err.name === "ValidationError") {
    // Mongoose / Zod validation errors
    statusCode = 400;
    message = err.message;
    isOperational = true;
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token";
    isOperational = true;
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
    isOperational = true;
  } else if (err.name === "PrismaClientKnownRequestError") {
    statusCode = 400;
    const prismaErr = err as any;
    if (prismaErr.code === "P2002") {
      message = "A record with this value already exists";
    } else if (prismaErr.code === "P2025") {
      statusCode = 404;
      message = "Record not found";
    } else {
      message = "Database operation failed";
    }
    isOperational = true;
  } else if (err.name === "PrismaClientValidationError") {
    statusCode = 400;
    message = "Invalid data provided";
    isOperational = true;
  }

  // Log non-operational (unexpected) errors with full stack
  if (!isOperational) {
    logger.error("Unhandled error", err, {
      statusCode,
      path: _req.path,
      method: _req.method,
      requestId: _req.requestId,
    });
  } else {
    logger.warn(`${statusCode} ${message}`, {
      path: _req.path,
      method: _req.method,
      requestId: _req.requestId,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId: _req.requestId,
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
    }),
  });
};
