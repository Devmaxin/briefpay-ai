/**
 * Versioning and proposal data tests.
 * No network or credentials required.
 * Run with: npm test   (node --test tests/*.test.ts)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { snapshotOf } from "../lib/proposal-snapshot.ts";
import {
  ProposalDraftPayloadSchema,
  UpdateProposalSchema,
  AnalyzeBriefSchema,
} from "../lib/validation.ts";
import type { ProposalRow } from "../lib/types.ts";

function baseProposal(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    owner_id: "22222222-2222-4222-8222-222222222222",
    brief_id: "33333333-3333-4333-8333-333333333333",
    title: "Bakery Website",
    summary: "A modern website for a bakery with online cake ordering.",
    assumptions: ["Client provides logo and copy."],
    deliverables: [{ title: "Homepage", description: "Hero section" }],
    milestones: [{ title: "Design", description: "Mockups", duration: "Week 1" }],
    price: 1800,
    currency: "USD",
    estimated_timeline: "3 weeks",
    exclusions: ["Copywriting"],
    revision_policy: "Two rounds included.",
    unresolved: ["Hosting access"],
    status: "draft",
    share_token: null,
    approved_version_id: null,
    final_price: null,
    revoked_at: null,
    accepted_at: null,
    created_at: "2026-10-31T10:00:00Z",
    updated_at: "2026-10-31T10:00:00Z",
    ...overrides,
  };
}

describe("snapshotOf", () => {
  it("produces an immutable snapshot of the proposal", () => {
    const snap = snapshotOf(baseProposal());
    assert.equal(snap.title, "Bakery Website");
    // Price is captured as `price` in the snapshot (not suggested_price).
    assert.equal(snap.price, 1800);
    assert.equal(snap.currency, "USD");
    assert.equal(snap.estimated_timeline, "3 weeks");
    assert.deepEqual(snap.deliverables, [{ title: "Homepage", description: "Hero section" }]);
    assert.deepEqual(snap.milestones, [{ title: "Design", description: "Mockups", duration: "Week 1" }]);
    assert.ok(typeof snap.approved_at === "string" && snap.approved_at.length > 0);
  });

  it("captures a different price when the proposal changes", () => {
    const snap = snapshotOf(baseProposal({ price: 2400, currency: "EUR" }));
    assert.equal(snap.price, 2400);
    assert.equal(snap.currency, "EUR");
  });
});

describe("version payload validation", () => {
  it("accepts a complete AI proposal draft", () => {
    const draft = {
      title: "Bakery Website",
      summary: "A modern website for a bakery with online cake ordering.",
      assumptions: ["Client provides logo and copy."],
      deliverables: [{ title: "Homepage", description: "Hero section" }],
      milestones: [{ title: "Design", description: "Mockups", duration: "Week 1" }],
      suggested_price: 1800,
      currency: "USD",
      estimated_timeline: "3 weeks",
      exclusions: ["Copywriting"],
      revision_policy: "Two rounds included.",
      unresolved: ["Hosting access"],
    };
    assert.equal(ProposalDraftPayloadSchema.safeParse(draft).success, true);
  });

  it("rejects a draft with no deliverables", () => {
    const draft = {
      title: "Bakery Website",
      summary: "A modern website for a bakery.",
      deliverables: [],
      suggested_price: 1800,
      estimated_timeline: "3 weeks",
      revision_policy: "Two rounds included.",
    };
    assert.equal(ProposalDraftPayloadSchema.safeParse(draft).success, false);
  });

  it("rejects a draft with a symbolic price", () => {
    const draft = {
      title: "Bakery Website",
      summary: "A modern website for a bakery.",
      deliverables: [{ title: "Homepage", description: "Hero section" }],
      suggested_price: "free",
      estimated_timeline: "3 weeks",
      revision_policy: "Two rounds included.",
    };
    assert.equal(ProposalDraftPayloadSchema.safeParse(draft).success, false);
  });
});

describe("proposal editing validation", () => {
  it("accepts a partial update with a title", () => {
    assert.equal(UpdateProposalSchema.safeParse({ title: "New title here" }).success, true);
  });

  it("rejects an empty update", () => {
    assert.equal(UpdateProposalSchema.safeParse({}).success, false);
  });

  it("rejects a non-positive price", () => {
    assert.equal(UpdateProposalSchema.safeParse({ price: -10 }).success, false);
    assert.equal(UpdateProposalSchema.safeParse({ price: 0 }).success, false);
  });
});

describe("brief analysis validation", () => {
  it("accepts a normal brief with optional fields", () => {
    const r = AnalyzeBriefSchema.safeParse({
      raw_request: "Build me a bakery website with online cake ordering before December.",
      project_type: "Web design",
      project_name: "Bakery site",
      client_name: "Fern & Field Café",
      currency: "USD",
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.currency, "USD");
      assert.equal(r.data.project_type, "Web design");
    }
  });

  it("rejects tiny requests", () => {
    assert.equal(AnalyzeBriefSchema.safeParse({ raw_request: "hi" }).success, false);
  });

  it("rejects oversized requests", () => {
    assert.equal(
      AnalyzeBriefSchema.safeParse({ raw_request: "x".repeat(4001) }).success,
      false,
    );
  });

  it("defaults currency to USD", () => {
    const r = AnalyzeBriefSchema.safeParse({ raw_request: "Build me a website project." });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.currency, "USD");
  });
});
