import { S3Client } from "@aws-sdk/client-s3";

/**
 * Centralized S3 client instance.
 * Credentials are loaded from environment variables (validated at startup by env.ts).
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
});

export { s3Client };
