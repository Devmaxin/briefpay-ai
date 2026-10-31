/**
 * Dashboard statistics math — pure functions, no credentials required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatCurrencyTotals,
  primaryCurrency,
  proposalAmount,
  summariseProposals,
  verifiedTotals,
} from "../lib/dashboard-stats.ts";

describe("summariseProposals", () => {
  it("counts every status consistently and returns zeros for an empty pipeline", () => {
    assert.deepEqual(summariseProposals([]), {
      total: 0,
      open: 0,
      awaitingPayment: 0,
      paid: 0,
    });

    const counts = summariseProposals([
      { status: "draft" },
      { status: "draft" },
      { status: "approved" },
      { status: "paid" },
    ]);
    assert.deepEqual(counts, {
      total: 4,
      open: 2,
      awaitingPayment: 1,
      paid: 1,
    });
  });

  it("counts unknown statuses toward the total only", () => {
    assert.deepEqual(summariseProposals([{ status: "archived" }]), {
      total: 1,
      open: 0,
      awaitingPayment: 0,
      paid: 0,
    });
  });
});

describe("proposalAmount", () => {
  it("prefers the frozen final price once approved", () => {
    assert.equal(proposalAmount({ status: "approved", price: 2000, final_price: 1850 }), 1850);
  });

  it("falls back to the working price for drafts and legacy rows", () => {
    assert.equal(proposalAmount({ status: "draft", price: 2000, final_price: null }), 2000);
    assert.equal(proposalAmount({ status: "draft", price: "1450.50" }), 1450.5);
  });

  it("never renders NaN from malformed data", () => {
    assert.equal(proposalAmount({ status: "draft", price: "not-a-number" }), 0);
    assert.equal(proposalAmount({ status: "draft" }), 0);
  });
});

describe("verifiedTotals", () => {
  it("only counts captured payments — created, pending and failed are excluded", () => {
    const totals = verifiedTotals([
      { amount: 1800, currency: "USD", status: "captured" },
      { amount: 900, currency: "USD", status: "created" },
      { amount: 500, currency: "USD", status: "pending" },
      { amount: 100, currency: "USD", status: "failed" },
      { amount: 250.25, currency: "usd", status: "captured" },
    ]);
    assert.deepEqual(totals, [{ currency: "USD", total: 2050.25 }]);
  });

  it("keeps currencies separate and sorts by size", () => {
    const totals = verifiedTotals([
      { amount: 100, currency: "EUR", status: "captured" },
      { amount: 400, currency: "USD", status: "captured" },
    ]);
    assert.deepEqual(totals, [
      { currency: "USD", total: 400 },
      { currency: "EUR", total: 100 },
    ]);
  });

  it("returns nothing when no capture has been verified", () => {
    assert.deepEqual(verifiedTotals([{ amount: 100, currency: "USD", status: "created" }]), []);
  });
});

describe("primaryCurrency", () => {
  it("uses the currency of most proposals, defaulting to USD", () => {
    assert.equal(primaryCurrency([]), "USD");
    assert.equal(
      primaryCurrency([
        { status: "draft", currency: "EUR" },
        { status: "draft", currency: "eur" },
        { status: "draft", currency: "USD" },
      ]),
      "EUR",
    );
  });
});

describe("formatCurrencyTotals", () => {
  it("formats each currency independently", () => {
    assert.deepEqual(
      formatCurrencyTotals([
        { currency: "USD", total: 2400 },
        { currency: "USD", total: 1234.5 },
      ]),
      ["$2,400", "$1,234.50"],
    );
  });
});
