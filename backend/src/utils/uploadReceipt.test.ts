import { beforeAll, describe, expect, it } from "vitest";
import { createUploadReceipt, uploadMatchesReceipt, verifyUploadReceipt } from "./uploadReceipt";

describe("direct upload receipts", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "upload-receipt-test-secret-that-is-long-enough-for-tests-2026";
  });

  it("binds an upload to owner, purpose, type, and exact size", () => {
    const token = createUploadReceipt({
      key: "lectures/course/user/video.webm",
      ownerId: "user",
      purpose: "recorded-lecture:course",
      contentType: "video/webm",
      size: 12,
    });
    const receipt = verifyUploadReceipt(token, {
      key: "lectures/course/user/video.webm",
      ownerId: "user",
      purpose: "recorded-lecture:course",
    });
    expect(receipt).not.toBeNull();
    expect(uploadMatchesReceipt(receipt!, { size: 12, contentType: "video/webm" })).toBe(true);
    expect(uploadMatchesReceipt(receipt!, { size: 11, contentType: "video/webm" })).toBe(false);
    expect(uploadMatchesReceipt(receipt!, { size: 12, contentType: "video/mp4" })).toBe(false);
  });

  it("rejects tampering and cross-purpose reuse", () => {
    const token = createUploadReceipt({
      key: "submissions/a/user/file.pdf",
      ownerId: "user",
      purpose: "assessment:a",
      contentType: "application/pdf",
      size: 20,
    });
    expect(
      verifyUploadReceipt(`${token}x`, {
        key: "submissions/a/user/file.pdf",
        ownerId: "user",
        purpose: "assessment:a",
      }),
    ).toBeNull();
    expect(
      verifyUploadReceipt(token, {
        key: "submissions/a/user/file.pdf",
        ownerId: "user",
        purpose: "assessment:b",
      }),
    ).toBeNull();
  });
});
