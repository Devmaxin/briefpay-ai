/**
 * Validation + payment-verification unit tests.
 * Run with: npm test   (node --test tests/)
 * No network, no credentials required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AnalyzeBriefSchema,
  CaptureOrderSchema,
  ClarifyingQuestionsPayloadSchema,
  CreateOrderSchema,
  GenerateProposalSchema,
  MoneySchema,
  ProposalDraftPayloadSchema,
  ShareTokenSchema,
  UpdateProposalSchema,
} from "../lib/validation.ts";
import { verifyCapture, formatPayPalAmount } from "../lib/paypal.ts";
import type { PayPalOrder } from "../lib/paypal.ts";

const VALID_TOKEN = "a".repeat(32);

function paypalOrder(overrides: Partial<PayPalOrder> = {}): PayPalOrder {
  return {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [
      {
        amount: { currency_code: "USD", value: "1800.00" },
        payments: {
          captures: [
            { id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "1800.00" } },
          ],
        },
      },
    ],
    ...overrides,
  };
}

describe("AnalyzeBriefSchema", () => {
  it("rejects tiny requests", () => {
    assert.equal(AnalyzeBriefSchema.safeParse({ raw_request: "hi" }).success, false);
  });
  it("rejects oversized requests", () => {
    assert.equal(
      AnalyzeBriefSchema.safeParse({ raw_request: "x".repeat(4001) }).success,
      false,
    );
  });
  it("accepts a normal brief with currency default", () => {
    const r = AnalyzeBriefSchema.safeParse({ raw_request: "Build me a bakery website with online cake ordering before December." });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.currency, "USD");
  });
});

describe("MoneySchema", () => {
  it("accepts numbers and numeric strings", () => {
    assert.equal(MoneySchema.safeParse(1200).success, true);
    assert.equal(MoneySchema.safeParse("1200.50").success, true);
  });
  it("rejects symbols, negatives, zero", () => {
    assert.equal(MoneySchema.safeParse("$1200").success, false);
    assert.equal(MoneySchema.safeParse(-5).success, false);
    assert.equal(MoneySchema.safeParse(0).success, false);
  });
});

describe("AI payload schemas", () => {
  it("rejects empty or oversized question lists", () => {
    assert.equal(ClarifyingQuestionsPayloadSchema.safeParse({ questions: [] }).success, false);
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `q${i}`, question: "A sufficiently long question text?", optional: false,
    }));
    assert.equal(ClarifyingQuestionsPayloadSchema.safeParse({ questions: six }).success, false);
  });
  it("rejects malformed proposal drafts (missing deliverables, bad price)", () => {
    const base = {
      title: "Test project",
      summary: "A sufficiently long summary of the project scope for testing.",
      deliverables: [{ title: "Thing", description: "" }],
      suggested_price: 100,
      estimated_timeline: "1 week",
      revision_policy: "One round.",
    };
    assert.equal(ProposalDraftPayloadSchema.safeParse({ ...base, suggested_price: "free" }).success, false);
    assert.equal(ProposalDraftPayloadSchema.safeParse({ ...base, deliverables: [] }).success, false);
    assert.equal(ProposalDraftPayloadSchema.safeParse(base).success, true);
  });
});

describe("GenerateProposalSchema", () => {
  it("rejects invalid brief ids and >5 answers", () => {
    assert.equal(
      GenerateProposalSchema.safeParse({ brief_id: "not-a-uuid", answers: [] }).success,
      false,
    );
    const answers = Array.from({ length: 6 }, (_, i) => ({ question_id: `q${i}`, answer: "x" }));
    assert.equal(
      GenerateProposalSchema.safeParse({ brief_id: "123e4567-e89b-12d3-a456-426614174000", answers }).success,
      false,
    );
  });
});

describe("UpdateProposalSchema", () => {
  it("requires at least one change and a positive price", () => {
    assert.equal(UpdateProposalSchema.safeParse({}).success, false);
    assert.equal(UpdateProposalSchema.safeParse({ price: -10 }).success, false);
    assert.equal(UpdateProposalSchema.safeParse({ title: "New title here" }).success, true);
  });
});

describe("ShareTokenSchema", () => {
  it("accepts 32-char tokens, rejects short/garbage", () => {
    assert.equal(ShareTokenSchema.safeParse(VALID_TOKEN).success, true);
    assert.equal(ShareTokenSchema.safeParse("short").success, false);
    assert.equal(ShareTokenSchema.safeParse("../etc/passwd........................").success, false);
  });
  it("checkout schemas require the token", () => {
    assert.equal(CreateOrderSchema.safeParse({ token: VALID_TOKEN }).success, true);
    assert.equal(CreateOrderSchema.safeParse({ token: "nope" }).success, false);
    assert.equal(
      CaptureOrderSchema.safeParse({ token: VALID_TOKEN, order_id: "ABC123" }).success,
      true,
    );
    assert.equal(
      CaptureOrderSchema.safeParse({ token: VALID_TOKEN, order_id: "evil;DROP" }).success,
      false,
    );
  });
});

describe("verifyCapture (amount/currency tampering)", () => {
  it("accepts an exact match", () => {
    const v = verifyCapture(paypalOrder(), { amount: 1800, currency: "USD" });
    assert.equal(v.captureId, "CAP-1");
  });
  it("rejects amount mismatch", () => {
    assert.throws(() => verifyCapture(paypalOrder(), { amount: 1, currency: "USD" }), /Amount mismatch/);
  });
  it("rejects currency mismatch", () => {
    assert.throws(() => verifyCapture(paypalOrder(), { amount: 1800, currency: "EUR" }), /Amount mismatch/);
  });
  it("rejects unreadable orders", () => {
    assert.throws(() => verifyCapture({ id: "X", status: "COMPLETED" }, { amount: 1, currency: "USD" }), /unreadable/);
  });
  it("rejects wrong payee email", () => {
    const order = paypalOrder({
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payee: { email_address: "attacker@example.com" },
          payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "1800.00" } }] },
        },
      ],
    });
    assert.throws(
      () => verifyCapture(order, { amount: 1800, currency: "USD", merchantEmail: "seller@example.com" }),
      /not payable to the expected merchant/,
    );
  });
});

describe("formatPayPalAmount", () => {
  it("always sends two decimals and uppercase currency", () => {
    assert.deepEqual(formatPayPalAmount(1800, "usd"), { currency_code: "USD", value: "1800.00" });
  });
});
