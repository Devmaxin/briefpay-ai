/**
 * Share link tests — pure validation + token format, no credentials required.
 * Run with: npm test   (node --test tests/*.test.ts)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ShareTokenSchema } from "../lib/validation.ts";
import { generateShareToken } from "../lib/utils.ts";

describe("ShareTokenSchema", () => {
  const VALID_TOKEN = "a".repeat(32);

  it("accepts a 32-character base64url token", () => {
    assert.equal(ShareTokenSchema.safeParse(VALID_TOKEN).success, true);
  });

  it("rejects short tokens", () => {
    assert.equal(ShareTokenSchema.safeParse("short").success, false);
  });

  it("rejects tokens with path traversal characters", () => {
    assert.equal(
      ShareTokenSchema.safeParse("../etc/passwd........................").success,
      false,
    );
  });

  it("rejects tokens with invalid characters", () => {
    assert.equal(
      ShareTokenSchema.safeParse("!@#$%^&*()".repeat(4)).success,
      false,
    );
  });
});

describe("generateShareToken", () => {
  it("produces a 32-character token", () => {
    const token = generateShareToken();
    assert.equal(token.length, 32);
  });

  it("produces cryptographically random tokens (no collisions)", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      tokens.add(generateShareToken());
    }
    assert.equal(tokens.size, 1000);
  });

  it("uses only URL-safe base64url characters", () => {
    const token = generateShareToken();
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  it("does not include padding characters", () => {
    const token = generateShareToken();
    assert.equal(token.includes("="), false);
  });
});
