import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";
import { logger } from "./logger";

/**
 * Azure Blob Storage driver.
 *
 * Mirrors the storage operations the app needs:
 *  - public uploads (thumbnails, profile pics) → public container, returns a direct URL
 *  - private uploads (videos, certificates, submissions) → private container
 *  - SAS URLs for reading private blobs and for direct (presigned-style) uploads
 *
 * Configured via:
 *  - AZURE_STORAGE_ACCOUNT
 *  - AZURE_STORAGE_KEY
 *  - AZURE_PUBLIC_CONTAINER  (default "public")
 *  - AZURE_PRIVATE_CONTAINER (default "private")
 */

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT as string;
const ACCOUNT_KEY = process.env.AZURE_STORAGE_KEY as string;
const PUBLIC_CONTAINER = process.env.AZURE_PUBLIC_CONTAINER || "public";
const PRIVATE_CONTAINER = process.env.AZURE_PRIVATE_CONTAINER || "private";

export const AZURE_STORAGE_CONFIGURED = Boolean(ACCOUNT && ACCOUNT_KEY);

let credential: StorageSharedKeyCredential | null = null;
let serviceClient: BlobServiceClient | null = null;

if (AZURE_STORAGE_CONFIGURED) {
  credential = new StorageSharedKeyCredential(ACCOUNT, ACCOUNT_KEY);
  serviceClient = new BlobServiceClient(`https://${ACCOUNT}.blob.core.windows.net`, credential);
}

const getContainerClient = (container: string) => {
  if (!serviceClient) {
    throw new Error("Azure Blob Storage is not configured.");
  }
  return serviceClient.getContainerClient(container);
};

const publicUrl = (container: string, key: string): string =>
  `https://${ACCOUNT}.blob.core.windows.net/${container}/${key}`;

export const azureUploadPublic = async (
  buffer: Buffer,
  mimetype: string,
  key: string,
): Promise<string> => {
  const client = getContainerClient(PUBLIC_CONTAINER).getBlockBlobClient(key);
  await client.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimetype } });
  return publicUrl(PUBLIC_CONTAINER, key);
};

export const azureUploadPrivate = async (
  buffer: Buffer,
  mimetype: string,
  key: string,
): Promise<string> => {
  const client = getContainerClient(PRIVATE_CONTAINER).getBlockBlobClient(key);
  await client.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimetype } });
  // Store the canonical blob URL; reads go through a SAS URL generated on demand.
  return publicUrl(PRIVATE_CONTAINER, key);
};

/** Read (download/view) SAS URL for a private blob. */
export const azureReadSasUrl = (key: string, expiresInSeconds = 86400): string => {
  if (!credential) {
    throw new Error("Azure Blob Storage is not configured.");
  }
  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: PRIVATE_CONTAINER,
      blobName: key,
      permissions: BlobSASPermissions.parse("r"),
      protocol: SASProtocol.Https,
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn,
    },
    credential,
  ).toString();
  return `${publicUrl(PRIVATE_CONTAINER, key)}?${sas}`;
};

/** Write SAS URL for direct client uploads (presigned-PUT equivalent). */
export const azureWriteSasUrl = (key: string, expiresInSeconds = 900): string => {
  if (!credential) {
    throw new Error("Azure Blob Storage is not configured.");
  }
  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: PRIVATE_CONTAINER,
      blobName: key,
      permissions: BlobSASPermissions.parse("cw"),
      protocol: SASProtocol.Https,
      startsOn: new Date(Date.now() - 5 * 60 * 1000),
      expiresOn,
    },
    credential,
  ).toString();
  return `${publicUrl(PRIVATE_CONTAINER, key)}?${sas}`;
};

export const azureDeletePrivate = async (key: string): Promise<void> => {
  try {
    await getContainerClient(PRIVATE_CONTAINER).getBlockBlobClient(key).deleteIfExists();
  } catch (error) {
    logger.error("Azure blob delete failed:", error);
  }
};

export const azurePrivateObjectExists = async (key: string): Promise<boolean> =>
  getContainerClient(PRIVATE_CONTAINER).getBlockBlobClient(key).exists();

export const azurePrivateObjectMetadata = async (
  key: string,
): Promise<{ size: number; contentType?: string }> => {
  const properties = await getContainerClient(PRIVATE_CONTAINER)
    .getBlockBlobClient(key)
    .getProperties();
  return {
    size: properties.contentLength ?? 0,
    contentType: properties.contentType,
  };
};

export const azurePrivateObjectUrl = (key: string): string => publicUrl(PRIVATE_CONTAINER, key);

export const azureStorageHealthCheck = async (): Promise<void> => {
  await Promise.all([
    getContainerClient(PUBLIC_CONTAINER).getProperties(),
    getContainerClient(PRIVATE_CONTAINER).getProperties(),
  ]);
};

/** Extract the blob key (path within the container) from a stored blob URL. */
export const azureExtractKey = (urlOrKey: string): string => {
  try {
    const u = new URL(urlOrKey);
    // pathname: /<container>/<key...>
    const parts = u.pathname.replace(/^\/+/, "").split("/");
    parts.shift(); // drop container name
    return parts.join("/");
  } catch {
    return urlOrKey.replace(/^\/+/, "");
  }
};
