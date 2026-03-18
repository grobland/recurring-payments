import { describe, it, expect } from "vitest";
import { generateSourceHash } from "@/lib/utils/source-hash";

describe("generateSourceHash", () => {
  it("returns a 64-character hex string", () => {
    const hash = generateSourceHash("stmt-abc-123", 1);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic: same inputs produce same hash", () => {
    const hash1 = generateSourceHash("stmt-abc-123", 1);
    const hash2 = generateSourceHash("stmt-abc-123", 1);
    expect(hash1).toBe(hash2);
  });

  it("different sequence number produces different hash", () => {
    const hash1 = generateSourceHash("stmt-abc-123", 1);
    const hash2 = generateSourceHash("stmt-abc-123", 2);
    expect(hash1).not.toBe(hash2);
  });

  it("different statement ID produces different hash", () => {
    const hash1 = generateSourceHash("stmt-abc-123", 1);
    const hash2 = generateSourceHash("stmt-xyz-999", 1);
    expect(hash1).not.toBe(hash2);
  });

  it("returns exactly 64 characters (SHA-256 hex)", () => {
    const hash = generateSourceHash("any-statement", 42);
    expect(hash.length).toBe(64);
  });

  it("handles sequence number 0", () => {
    const hash = generateSourceHash("stmt-abc-123", 0);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles large sequence numbers", () => {
    const hash = generateSourceHash("stmt-abc-123", 9999);
    expect(hash).toHaveLength(64);
  });

  it("different inputs always produce unique hashes", () => {
    const hashes = new Set([
      generateSourceHash("stmt-a", 1),
      generateSourceHash("stmt-a", 2),
      generateSourceHash("stmt-b", 1),
      generateSourceHash("stmt-b", 2),
    ]);
    expect(hashes.size).toBe(4);
  });
});
