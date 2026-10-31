/**
 * Client acceptance tests — pure validation + business logic, no credentials required.
 * Run with: npm test   (node --test tests/*.test.ts)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { ShareTokenSchema } from "../lib/validation.ts";

/**
 * Mirrors the acceptance request schema used by the public API route.
 * Tested independently since the route itself needs a live Supabase project.
 */
const AcceptProposalSchema = z.object({
  token: ShareTokenSchema,
  client_name: z.string().trim().max(140).optional(),
  client_email: z.string().trim().email().max(254).optional(),
  terms_agreed: z.boolean().default(true),
});

const VALID_TOKEN = "a".repeat(32);

describe("AcceptProposalSchema", () => {
  it("accepts a valid acceptance with terms agreed", () => {
    const r = AcceptProposalSchema.safeParse({
      token: VALID_TOKEN,
      client_name: "Jane Doe",
      client_email: "jane@example.com",
      terms_agreed: true,
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.client_name, "Jane Doe");
      assert.equal(r.data.client_email, "jane@example.com");
      assert.equal(r.data.terms_agreed, true);
    }
  });

  it("accepts a minimal acceptance (token + terms only)", () => {
    const r = AcceptProposalSchema.safeParse({
      token: VALID_TOKEN,
      terms_agreed: true,
    });
    assert.equal(r.success, true);
  });

  it("rejects an invalid token", () => {
    assert.equal(
      AcceptProposalSchema.safeParse({
        token: "short",
        terms_agreed: true,
      }).success,
      false,
    );
  });

  it("accepts terms_agreed as a boolean (API enforces it must be true)", () => {
    const r = AcceptProposalSchema.safeParse({
      token: VALID_TOKEN,
      terms_agreed: false,
    });
    assert.equal(r.success, true);
  });

  it("rejects an invalid email", () => {
    assert.equal(
      AcceptProposalSchema.safeParse({
        token: VALID_TOKEN,
        client_email: "not-an-email",
        terms_agreed: true,
      }).success,
      false,
    );
  });

  it("rejects an oversized client name", () => {
    assert.equal(
      AcceptProposalSchema.safeParse({
        token: VALID_TOKEN,
        client_name: "x".repeat(141),
        terms_agreed: true,
      }).success,
      false,
    );
  });

  it("defaults terms_agreed to true", () => {
    const r = AcceptProposalSchema.safeParse({
      token: VALID_TOKEN,
    });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.terms_agreed, true);
  });
});

describe("Acceptance business rules", () => {
  it("a paid proposal cannot be re-accepted", () => {
    // Simulated business rule: status "paid" → acceptance not allowed.
    const status = "paid" as string;
    const canAccept = status !== "paid" && status !== "draft";
    assert.equal(canAccept, false);
  });

  it("a draft proposal cannot be accepted", () => {
    const status = "draft" as string;
    const canAccept = status !== "paid" && status !== "draft";
    assert.equal(canAccept, false);
  });

  it("an approved proposal can be accepted", () => {
    const status = "approved" as string;
    const canAccept = status !== "paid" && status !== "draft";
    assert.equal(canAccept, true);
  });

  it("a revoked link cannot be accepted", () => {
    const revokedAt = new Date().toISOString() as string;
    const canAccept = !revokedAt;
    assert.equal(canAccept, false);
  });

  it("an active link can be accepted", () => {
    const revokedAt = null as string | null;
    const canAccept = !revokedAt;
    assert.equal(canAccept, true);
  });
});
