import { describe, it } from "node:test";
import assert from "node:assert";
import { validateMagicBytes } from "./validation.ts";

describe("validateMagicBytes", () => {
  it("should return true for valid PNG magic bytes", () => {
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/png"), true);
  });

  it("should return false for invalid PNG magic bytes", () => {
    const buffer = new Uint8Array([0x00, 0x50, 0x4e, 0x47, 0x00, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/png"), false);
  });

  it("should return true for valid JPEG magic bytes", () => {
    const buffer = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/jpeg"), true);
  });

  it("should return true for valid GIF87a magic bytes", () => {
    const buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/gif"), true);
  });

  it("should return true for valid GIF89a magic bytes", () => {
    const buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/gif"), true);
  });

  it("should return true for valid WebP magic bytes", () => {
    const buffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/webp"), true);
  });

  it("should return true for valid PDF magic bytes", () => {
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "application/pdf"), true);
  });

  it("should return true for MIME types without signatures", () => {
    const buffer = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "text/plain"), true);
    assert.strictEqual(validateMagicBytes(buffer, "text/markdown"), true);
  });

  it("should return false for empty buffer when signature is expected", () => {
    const buffer = new ArrayBuffer(0);
    assert.strictEqual(validateMagicBytes(buffer, "image/png"), false);
  });

  it("should return false for buffer shorter than signature", () => {
    const buffer = new Uint8Array([0x89, 0x50]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/png"), false);
  });

  it("should return false when bytes match partially but not fully", () => {
    const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x00]).buffer;
    assert.strictEqual(validateMagicBytes(buffer, "image/png"), false);
  });
});
