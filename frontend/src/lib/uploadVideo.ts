import axios from "axios";

/**
 * Direct-to-storage video upload helper.
 *
 * Large recorded lectures (multi-hour, multi-GB) cannot be proxied through the
 * API — they are uploaded straight to private cloud storage using a short-lived
 * presigned URL issued by the backend.
 *
 * Azure Blob limits a single `Put Blob` request to a few GB, so anything larger
 * is staged in blocks (`Put Block`) and then committed in order
 * (`Put Block List`). This supports effectively uncapped lecture lengths. Small
 * files, and non-Azure (S3/local) targets, use a single streamed PUT.
 */

export interface StorageUploadTarget {
  uploadUrl: string;
  headers?: Record<string, string>;
}

const AZURE_BLOB_HOST = "blob.core.windows.net";
// Files at or below this size use one PUT (safe for every Azure API version and
// for S3 presigned PUT). Larger Azure files are chunked.
const SINGLE_SHOT_MAX = 100 * 1024 * 1024; // 100 MiB
// Block size for staged uploads. Azure allows up to 50,000 blocks per blob, so
// 25 MiB blocks support ~1.1 TB — well beyond any realistic lecture.
const BLOCK_SIZE = 25 * 1024 * 1024; // 25 MiB
const MAX_BLOCK_RETRIES = 3;

type ProgressFn = (percent: number) => void;

const isAzureTarget = (target: StorageUploadTarget): boolean =>
  target.uploadUrl.includes(AZURE_BLOB_HOST) ||
  Boolean(target.headers && "x-ms-blob-type" in target.headers);

const putWithRetry = async (
  url: string,
  body: Blob | string,
  config: Parameters<typeof axios.put>[2],
  retries = MAX_BLOCK_RETRIES,
): Promise<void> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await axios.put(url, body, config);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  throw lastError;
};

const uploadSingleShot = async (
  file: File,
  target: StorageUploadTarget,
  onProgress?: ProgressFn,
): Promise<void> => {
  await axios.put(target.uploadUrl, file, {
    headers: target.headers,
    withCredentials: false,
    timeout: 0,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    onUploadProgress: (event) => {
      const total = event.total || file.size;
      onProgress?.(Math.min(100, Math.round((event.loaded / total) * 100)));
    },
  });
};

const uploadAzureBlocks = async (
  file: File,
  target: StorageUploadTarget,
  onProgress?: ProgressFn,
): Promise<void> => {
  const contentType =
    target.headers?.["Content-Type"] || file.type || "application/octet-stream";
  const totalBlocks = Math.ceil(file.size / BLOCK_SIZE);
  const blockIds: string[] = [];
  let uploaded = 0;

  for (let index = 0; index < totalBlocks; index += 1) {
    const start = index * BLOCK_SIZE;
    const chunk = file.slice(start, Math.min(start + BLOCK_SIZE, file.size));
    // Block IDs must be equal-length, base64-encoded strings.
    const blockId = btoa(`block-${String(index).padStart(8, "0")}`);
    blockIds.push(blockId);

    await putWithRetry(
      `${target.uploadUrl}&comp=block&blockid=${encodeURIComponent(blockId)}`,
      chunk,
      {
        withCredentials: false,
        timeout: 0,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (event) => {
          const loaded = Math.min(event.loaded, chunk.size);
          onProgress?.(Math.min(99, Math.round(((uploaded + loaded) / file.size) * 100)));
        },
      },
    );

    uploaded += chunk.size;
    onProgress?.(Math.min(99, Math.round((uploaded / file.size) * 100)));
  }

  const blockListXml =
    '<?xml version="1.0" encoding="utf-8"?><BlockList>' +
    blockIds.map((id) => `<Latest>${id}</Latest>`).join("") +
    "</BlockList>";

  await putWithRetry(`${target.uploadUrl}&comp=blocklist`, blockListXml, {
    withCredentials: false,
    timeout: 0,
    headers: {
      "Content-Type": "application/xml",
      "x-ms-blob-content-type": contentType,
    },
  });

  onProgress?.(100);
};

/**
 * Upload a video file to storage using the backend-issued presigned target.
 * Automatically chunks large Azure uploads; uses a single PUT otherwise.
 */
export const uploadVideoToStorage = async (
  file: File,
  target: StorageUploadTarget,
  onProgress?: ProgressFn,
): Promise<void> => {
  if (isAzureTarget(target) && file.size > SINGLE_SHOT_MAX) {
    await uploadAzureBlocks(file, target, onProgress);
    return;
  }
  await uploadSingleShot(file, target, onProgress);
};
