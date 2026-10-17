import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { UPLOAD } from "../utils/constants";

const storage = multer.memoryStorage();

/**
 * File filter factory — validates MIME types before accepting uploads.
 */
function createFileFilter(allowedTypes: readonly string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(", ")}`));
    }
  };
}

// Separate upload configs with appropriate size limits + MIME validation
const imageUpload = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_IMAGE_SIZE },
  fileFilter: createFileFilter(UPLOAD.ALLOWED_IMAGE_TYPES),
});

const documentUpload = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_IMAGE_SIZE },
  fileFilter: createFileFilter([...UPLOAD.ALLOWED_IMAGE_TYPES, ...UPLOAD.ALLOWED_DOCUMENT_TYPES]),
});

const videoUpload = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_VIDEO_SIZE },
  fileFilter: createFileFilter(UPLOAD.ALLOWED_VIDEO_TYPES),
});

export const uploadExcel = documentUpload.single("excel_file");
export const uploadProfilePic = imageUpload.single("profilePic");
export const uploadCourseThumbnail = imageUpload.single("thumbnail");
export const uploadVideo = videoUpload.single("video");
