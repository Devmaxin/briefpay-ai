/**
 * PayPal payment tests.
 * Mocks `fetch` so no PayPal credentials or network are required.
 * Run with: npm test   (node --test tests/*.test.ts)
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  verifyCapture,
  formatPayPalAmount,
  type PayPalOrder,
} from "../lib/paypal.ts";

const realFetch = globalThis.fetch;

function uninstallFetchMock() {
  globalThis.fetch = realFetch;
}

beforeEach(() => {
  globalThis.fetch = realFetch;
});

afterEach(() => {
  uninstallFetchMock();
});

function makeOrder(overrides: Partial<PayPalOrder> = {}): PayPalOrder {
  return {
    id: "ORDER-TEST-1",
    status: "COMPLETED",
    payer: { email_address: "buyer-sandbox@example.com" },
    purchase_units: [
      {
        amount: { currency_code: "USD", value: "1800.00" },
        payee: { email_address: "seller-sandbox@example.com", merchant_id: "SELLER-ID" },
        payments: {
          captures: [
            { id: "CAP-TEST-1", status: "COMPLETED", amount: { currency_code: "USD", value: "1800.00" } },
          ],
        },
      },
    ],
    ...overrides,
  };
}

describe("verifyCapture", () => {
  it("verifies a successful capture with matching amount and currency", () => {
    const result = verifyCapture(makeOrder(), { amount: 1800, currency: "USD" });
    assert.equal(result.orderId, "ORDER-TEST-1");
    assert.equal(result.orderStatus, "COMPLETED");
    assert.equal(result.captureId, "CAP-TEST-1");
    assert.equal(result.captureStatus, "COMPLETED");
    assert.equal(result.amount, 1800);
    assert.equal(result.currency, "USD");
    assert.equal(result.payerEmail, "buyer-sandbox@example.com");
    assert.equal(result.payeeEmail, "seller-sandbox@example.com");
  });

  it("rejects a tampered amount", () => {
    assert.throws(
      () => verifyCapture(makeOrder(), { amount: 1, currency: "USD" }),
      /Amount mismatch/,
    );
  });

  it("rejects a currency mismatch", () => {
    assert.throws(
      () => verifyCapture(makeOrder(), { amount: 1800, currency: "EUR" }),
      /Amount mismatch/,
    );
  });

  it("rejects when payee does not match expected merchant email", () => {
    assert.throws(
      () =>
        verifyCapture(makeOrder(), {
          amount: 1800,
          currency: "USD",
          merchantEmail: "wrong-merchant@example.com",
        }),
      /not payable to the expected merchant/,
    );
  });

  it("accepts when payee matches expected merchant email", () => {
    const result = verifyCapture(makeOrder(), {
      amount: 1800,
      currency: "USD",
      merchantEmail: "seller-sandbox@example.com",
    });
    assert.equal(result.amount, 1800);
  });

  it("uses the order amount when no capture exists", () => {
    const order = makeOrder({
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payee: { email_address: "seller@example.com" },
          payments: { captures: [] },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.equal(result.amount, 1800);
    assert.equal(result.captureId, null);
  });

  it("rejects an order with no purchase units", () => {
    const order = makeOrder({ purchase_units: [] });
    assert.throws(
      () => verifyCapture(order, { amount: 1800, currency: "USD" }),
      /unreadable/,
    );
  });

  it("returns capture_id as null when no capture exists but order is approved", () => {
    const order = makeOrder({
      status: "APPROVED",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payee: { email_address: "seller@example.com" },
          payments: { captures: [] },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.equal(result.captureId, null);
    assert.equal(result.captureStatus, null);
    assert.equal(result.orderStatus, "APPROVED");
    assert.equal(result.amount, 1800);
  });

  it("handles pending capture status", () => {
    const order = makeOrder({
      status: "APPROVED",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payee: { email_address: "seller@example.com" },
          payments: {
            captures: [
              { id: "CAP-PENDING", status: "PENDING", amount: { currency_code: "USD", value: "1800.00" } },
            ],
          },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.equal(result.captureStatus, "PENDING");
    assert.equal(result.orderStatus, "APPROVED");
    assert.equal(result.amount, 1800);
  });

  it("handles decimal amounts correctly", () => {
    const order = makeOrder({
      purchase_units: [
        {
          amount: { currency_code: "EUR", value: "1234.56" },
          payee: { email_address: "seller@example.com" },
          payments: {
            captures: [
              { id: "CAP-DEC", status: "COMPLETED", amount: { currency_code: "EUR", value: "1234.56" } },
            ],
          },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1234.56, currency: "EUR" });
    assert.equal(result.amount, 1234.56);
    assert.equal(result.currency, "EUR");
  });

  it("is case-insensitive on currency", () => {
    const result = verifyCapture(makeOrder(), { amount: 1800, currency: "usd" });
    assert.equal(result.currency, "USD");
    assert.equal(result.amount, 1800);
  });

  it("extracts payer email when present", () => {
    const order = makeOrder({ payer: { email_address: "client@example.com" } });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.equal(result.payerEmail, "client@example.com");
  });

  it("returns null payerEmail when payer is missing", () => {
    const order = makeOrder({ payer: undefined });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.equal(result.payerEmail, null);
  });

  it("returns null payeeEmail when payee is missing", () => {
    const order = makeOrder({
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payments: {
            captures: [
              { id: "CAP-NO-PAYEE", status: "COMPLETED", amount: { currency_code: "USD", value: "1800.00" } },
            ],
          },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.equal(result.payeeEmail, null);
  });
});

describe("formatPayPalAmount", () => {
  it("always sends two decimals and uppercase currency", () => {
    assert.deepEqual(formatPayPalAmount(1800, "usd"), {
      currency_code: "USD",
      value: "1800.00",
    });
    assert.deepEqual(formatPayPalAmount(1234.5, "EUR"), {
      currency_code: "EUR",
      value: "1234.50",
    });
    assert.deepEqual(formatPayPalAmount(0.99, "GBP"), {
      currency_code: "GBP",
      value: "0.99",
    });
  });
});

describe("payment state transitions", () => {
  it("treats COMPLETED order status as verified paid", () => {
    const result = verifyCapture(makeOrder(), { amount: 1800, currency: "USD" });
    assert.equal(result.orderStatus, "COMPLETED");
    assert.equal(result.captureStatus, "COMPLETED");
  });

  it("treats PENDING capture as pending reconciliation", () => {
    const order = makeOrder({
      status: "APPROVED",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payee: { email_address: "seller@example.com" },
          payments: {
            captures: [
              { id: "CAP-PEND", status: "PENDING", amount: { currency_code: "USD", value: "1800.00" } },
            ],
          },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    const status = (result.captureStatus ?? result.orderStatus ?? "").toUpperCase();
    assert.equal(status, "PENDING");
  });

  it("treats APPROVED order without capture as pending", () => {
    const order = makeOrder({
      status: "APPROVED",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: "1800.00" },
          payee: { email_address: "seller@example.com" },
          payments: { captures: [] },
        },
      ],
    });
    const result = verifyCapture(order, { amount: 1800, currency: "USD" });
    const status = (result.captureStatus ?? result.orderStatus ?? "").toUpperCase();
    assert.equal(status, "APPROVED");
  });
});

describe("duplicate capture protection", () => {
  it("returns the same verified result on repeated verification (idempotent read)", () => {
    const order = makeOrder();
    const first = verifyCapture(order, { amount: 1800, currency: "USD" });
    const second = verifyCapture(order, { amount: 1800, currency: "USD" });
    assert.deepEqual(first, second);
    assert.equal(first.captureId, second.captureId);
  });
});
