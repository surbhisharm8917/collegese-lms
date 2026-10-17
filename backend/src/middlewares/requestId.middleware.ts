import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/;

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const supplied = req.get("X-Request-ID");
  req.requestId = supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  next();
};
