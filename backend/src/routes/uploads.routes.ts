import express, { Request, Response } from "express";
import {
  localWriteFile,
  localReadFile,
  validateLocalUploadSignature,
} from "../utils/localStorage.utils";
import { logger } from "../utils/logger";

/**
 * Local-storage HTTP endpoints (development only).
 * - PUT /api/v1/uploads/*  → stores the raw request body (presigned-PUT equivalent)
 * - Static files are served separately at GET /uploads/* (see server.ts)
 */
const uploadsRouter = express.Router();

// Accept any binary body for direct uploads.
uploadsRouter.use(express.raw({ type: "*/*", limit: "200mb" }));

uploadsRouter.put(/.*/, async (req: Request, res: Response) => {
  try {
    // Key is everything after the router mount path.
    const key = decodeURIComponent(req.path.replace(/^\/+/, ""));
    if (!key) {
      return res.status(400).json({ success: false, message: "Missing upload key." });
    }
    if (!validateLocalUploadSignature(key, req.query.expires, req.query.signature)) {
      return res.status(403).json({ success: false, message: "Upload URL is invalid or expired." });
    }
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      return res.status(400).json({ success: false, message: "Empty upload body." });
    }
    await localWriteFile(body, key);
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Local upload failed:", error);
    return res.status(500).json({ success: false, message: "Upload failed." });
  }
});

// Optional explicit fetch (static serving also covers this).
uploadsRouter.get(/.*/, async (req: Request, res: Response) => {
  try {
    const key = decodeURIComponent(req.path.replace(/^\/+/, ""));
    const data = await localReadFile(key);
    return res.status(200).send(data);
  } catch {
    return res.status(404).json({ success: false, message: "File not found." });
  }
});

export default uploadsRouter;
