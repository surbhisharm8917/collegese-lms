import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "./logger";
import { s3Client } from "../config/awsS3";
import {
  localWriteFile,
  localPublicUrl,
  localUploadUrl,
  localObjectExists,
  localObjectMetadata,
  localDeleteFile,
  extractKeyFromUrl,
} from "./localStorage.utils";
import {
  AZURE_STORAGE_CONFIGURED,
  azureUploadPublic,
  azureUploadPrivate,
  azureReadSasUrl,
  azureWriteSasUrl,
  azurePrivateObjectExists,
  azurePrivateObjectMetadata,
  azurePrivateObjectUrl,
  azureDeletePrivate,
  azureExtractKey,
  azureStorageHealthCheck,
} from "./azureBlob.utils";

const PUBLIC_BUCKET_NAME = process.env.AWS_PUBLIC_S3_BUCKET_NAME as string;
const PRIVATE_BUCKET_NAME = process.env.AWS_PRIVATE_S3_BUCKET_NAME as string;

/**
 * The explicit storage driver makes cloud switching deterministic. Credentials
 * for another provider can safely coexist without changing runtime behavior.
 */
export const STORAGE_DRIVER = (
  process.env.STORAGE_DRIVER ||
  (AZURE_STORAGE_CONFIGURED ? "azure" : PUBLIC_BUCKET_NAME && PRIVATE_BUCKET_NAME ? "s3" : "local")
).toLowerCase();
export const USE_AZURE_STORAGE = STORAGE_DRIVER === "azure";
export const USE_LOCAL_STORAGE = STORAGE_DRIVER === "local";

if (USE_AZURE_STORAGE) {
  logger.info("[storage] Using Azure Blob Storage driver.");
} else if (USE_LOCAL_STORAGE) {
  logger.warn("[storage] Using LOCAL filesystem storage driver (S3/Azure disabled).");
}

export const uploadPublicFileToS3 = async (
  fileBuffer: Buffer,
  mimetype: string,
  key: string,
): Promise<string> => {
  if (USE_AZURE_STORAGE) {
    return azureUploadPublic(fileBuffer, mimetype, key);
  }
  if (USE_LOCAL_STORAGE) {
    return localWriteFile(fileBuffer, key);
  }

  if (!PUBLIC_BUCKET_NAME) {
    throw new Error("AWS_PUBLIC_S3_BUCKET_NAME is not defined in environment variables.");
  }

  const uploadParams = {
    Bucket: PUBLIC_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    const publicBase = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "");
    return publicBase
      ? `${publicBase}/${key}`
      : `https://${PUBLIC_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    logger.error("Error uploading public file to S3:", error);
    throw new Error("Failed to upload public file to S3.");
  }
};

export const uploadPrivateFileToS3 = async (
  fileBuffer: Buffer,
  mimetype: string,
  key: string,
): Promise<string> => {
  if (USE_AZURE_STORAGE) {
    return azureUploadPrivate(fileBuffer, mimetype, key);
  }
  if (USE_LOCAL_STORAGE) {
    return localWriteFile(fileBuffer, key);
  }

  if (!PRIVATE_BUCKET_NAME) {
    throw new Error("AWS_PRIVATE_S3_BUCKET_NAME is not defined in environment variables.");
  }

  const uploadParams = {
    Bucket: PRIVATE_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  };

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    return `https://${PRIVATE_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    logger.error("Error uploading private file to S3:", error);
    throw new Error("Failed to upload private file to S3.");
  }
};

export const generatePresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<string> => {
  if (USE_AZURE_STORAGE) {
    return azureWriteSasUrl(key, expiresInSeconds);
  }
  if (USE_LOCAL_STORAGE) {
    return localUploadUrl(key);
  }

  if (!PRIVATE_BUCKET_NAME) {
    throw new Error("AWS_PRIVATE_S3_BUCKET_NAME is not defined in environment variables.");
  }
  const command = new PutObjectCommand({
    Bucket: PRIVATE_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

export const generatePresignedDownloadUrl = async (
  key: string,
  expiresInSeconds: number = 86400,
): Promise<string> => {
  if (USE_AZURE_STORAGE) {
    return azureReadSasUrl(key, expiresInSeconds);
  }
  if (USE_LOCAL_STORAGE) {
    return localPublicUrl(key);
  }

  const command = new GetObjectCommand({
    Bucket: PRIVATE_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

export const generatePresignedViewUrl = async (key: string): Promise<string> => {
  if (USE_AZURE_STORAGE) {
    return azureReadSasUrl(key);
  }
  if (USE_LOCAL_STORAGE) {
    return localPublicUrl(key);
  }

  if (!PRIVATE_BUCKET_NAME) {
    throw new Error("AWS_PRIVATE_S3_BUCKET_NAME is not defined.");
  }

  const command = new GetObjectCommand({
    Bucket: PRIVATE_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 86400 });
};

export const privateObjectExists = async (key: string): Promise<boolean> => {
  if (USE_AZURE_STORAGE) {
    return azurePrivateObjectExists(key);
  }
  if (USE_LOCAL_STORAGE) {
    return localObjectExists(key);
  }
  if (!PRIVATE_BUCKET_NAME) {
    return false;
  }
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: PRIVATE_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
};

export const privateObjectMetadata = async (
  key: string,
): Promise<{ size: number; contentType?: string }> => {
  if (USE_AZURE_STORAGE) {
    return azurePrivateObjectMetadata(key);
  }
  if (USE_LOCAL_STORAGE) {
    return localObjectMetadata(key);
  }
  if (!PRIVATE_BUCKET_NAME) {
    throw new Error("AWS_PRIVATE_S3_BUCKET_NAME is not defined.");
  }
  const metadata = await s3Client.send(
    new HeadObjectCommand({ Bucket: PRIVATE_BUCKET_NAME, Key: key }),
  );
  return {
    size: metadata.ContentLength ?? 0,
    contentType: metadata.ContentType,
  };
};

export const privateObjectReference = (key: string): string => {
  if (USE_AZURE_STORAGE) {
    return azurePrivateObjectUrl(key);
  }
  if (USE_LOCAL_STORAGE) {
    return localPublicUrl(key);
  }
  if (!PRIVATE_BUCKET_NAME) {
    throw new Error("AWS_PRIVATE_S3_BUCKET_NAME is not defined.");
  }
  return `https://${PRIVATE_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const extractPrivateObjectKey = (urlOrKey: string): string => {
  if (USE_AZURE_STORAGE) {
    return azureExtractKey(urlOrKey);
  }
  if (USE_LOCAL_STORAGE) {
    return extractKeyFromUrl(urlOrKey);
  }
  if (!urlOrKey.includes("://")) {
    return urlOrKey.replace(/^\/+/, "");
  }
  try {
    return decodeURIComponent(new URL(urlOrKey).pathname.replace(/^\/+/, ""));
  } catch {
    return urlOrKey.replace(/^\/+/, "");
  }
};

export const deletePrivateObject = async (urlOrKey: string): Promise<void> => {
  const key = extractPrivateObjectKey(urlOrKey);
  if (USE_AZURE_STORAGE) {
    return azureDeletePrivate(key);
  }
  if (USE_LOCAL_STORAGE) {
    return localDeleteFile(key);
  }
  if (!PRIVATE_BUCKET_NAME) {
    throw new Error("AWS_PRIVATE_S3_BUCKET_NAME is not defined.");
  }
  await s3Client.send(new DeleteObjectCommand({ Bucket: PRIVATE_BUCKET_NAME, Key: key }));
};

export const checkStorageHealth = async (): Promise<void> => {
  if (USE_AZURE_STORAGE) {
    return azureStorageHealthCheck();
  }
  if (USE_LOCAL_STORAGE) {
    return;
  }
  if (!PUBLIC_BUCKET_NAME || !PRIVATE_BUCKET_NAME) {
    throw new Error("S3 buckets are not configured.");
  }
  await Promise.all([
    s3Client.send(new HeadBucketCommand({ Bucket: PUBLIC_BUCKET_NAME })),
    s3Client.send(new HeadBucketCommand({ Bucket: PRIVATE_BUCKET_NAME })),
  ]);
};
