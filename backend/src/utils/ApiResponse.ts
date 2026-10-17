/**
 * Centralized API response helpers.
 * Ensures ALL endpoints return a consistent JSON shape:
 *
 *   { success: boolean, message: string, data?: T }
 */
import { Response } from "express";

export const ApiResponse = {
  success<T>(res: Response, data?: T, message: string = "Success", statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
    });
  },

  created<T>(res: Response, data?: T, message: string = "Created successfully") {
    return res.status(201).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
    });
  },

  noContent(res: Response) {
    return res.status(204).send();
  },

  error(res: Response, message: string = "Internal server error", statusCode: number = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  },

  paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = "Success",
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  },
};
