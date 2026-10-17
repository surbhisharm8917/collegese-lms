/**
 * Centralized custom error class for the entire backend.
 * Use this instead of throwing raw Error objects in services/controllers.
 *
 * @example
 *   throw new AppError("User not found", 404);
 *   throw new AppError("Validation failed", 400, true); // operational
 *   throw AppError.badRequest("Email is required");
 *   throw AppError.unauthorized("Invalid token");
 *   throw AppError.forbidden("Admin access required");
 *   throw AppError.notFound("Course not found");
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // --- Factory methods for common HTTP errors ---

  static badRequest(message: string = "Bad request"): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message: string = "Unauthorized"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, 403);
  }

  static notFound(message: string = "Not found"): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string = "Conflict"): AppError {
    return new AppError(message, 409);
  }

  static tooMany(message: string = "Too many requests"): AppError {
    return new AppError(message, 429);
  }

  static internal(message: string = "Internal server error"): AppError {
    return new AppError(message, 500, false);
  }
}
