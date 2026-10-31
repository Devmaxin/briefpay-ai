/**
 * PayPal Orders v2 integration — server-only. Sandbox only for the MVP.
 *
 * Security rules enforced here:
 *  - Amount and currency ALWAYS come from the approved proposal version
 *    in our database, never from the browser.
 *  - Orders are bound to (proposal, version, amount, currency).
 *  - Capture is idempotent: repeated callbacks reconcile instead of
 *    duplicating payments.
 */
import { serverEnv } from "./env.ts";

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

export class PayPalError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const id = serverEnv.paypalClientId;
  const secret = serverEnv.paypalClientSecret;
  const res = await fetch(`${SANDBOX_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new PayPalError("Could not reach PayPal. Please try again.");
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new PayPalError("Could not reach PayPal. Please try again.");
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3000) * 1000,
  };
  return tokenCache.token;
}

interface PayPalCall {
  method: string;
  path: string;
  requestId: string;
  body?: unknown;
}

async function call<T>({ method, path, requestId, body }: PayPalCall): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${SANDBOX_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": requestId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 422 && /ORDER_ALREADY_CAPTURED/i.test(text)) {
      throw new PayPalError("This order was already captured.", 409);
    }
    throw new PayPalError("PayPal rejected the request. Please try again.", 502);
  }
  return (await res.json()) as T;
}

export interface PayPalAmount {
  currency_code: string;
  value: string;
}

export interface PayPalOrder {
  id: string;
  status: string;
  payer?: { email_address?: string };
  purchase_units?: {
    amount: PayPalAmount;
    payee?: { email_address?: string; merchant_id?: string };
    payments?: {
      captures?: {
        id: string;
        status: string;
        amount?: PayPalAmount;
      }[];
    };
  }[];
}

export function formatPayPalAmount(amount: number, currency: string): PayPalAmount {
  return { currency_code: currency.toUpperCase(), value: amount.toFixed(2) };
}

/** Create a Sandbox order for an exact approved amount. All values are server-side. */
export async function createOrder(args: {
  proposalId: string;
  amount: number;
  currency: string;
  requestId: string;
  returnToken: string;
}): Promise<PayPalOrder> {
  const amount = formatPayPalAmount(args.amount, args.currency);
  return call<PayPalOrder>({
    method: "POST",
    path: "/v2/checkout/orders",
    requestId: args.requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `${args.proposalId}:${args.returnToken.slice(0, 8)}`,
          description: `BriefPay proposal ${args.proposalId.slice(0, 8)}`,
          amount,
        },
      ],
      application_context: { shipping_preference: "NO_SHIPPING" },
    },
  });
}

/** Fetch the authoritative order state from PayPal. */
export async function getOrder(orderId: string): Promise<PayPalOrder> {
  const token = await accessToken();
  const res = await fetch(`${SANDBOX_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new PayPalError("Could not verify the PayPal order.", 502);
  return (await res.json()) as PayPalOrder;
}

/** Capture an approved order. Safe to retry: 409 already-captured reconciles. */
export async function captureOrder(orderId: string, requestId: string): Promise<PayPalOrder> {
  return call<PayPalOrder>({
    method: "POST",
    path: `/v2/checkout/orders/${orderId}/capture`,
    requestId,
    body: {},
  });
}

export interface VerifiedCapture {
  orderId: string;
  orderStatus: string;
  captureId: string | null;
  captureStatus: string | null;
  amount: number;
  currency: string;
  payerEmail: string | null;
  payeeEmail: string | null;
}

/**
 * Verify a PayPal order/capture against the expected authoritative values.
 * Returns the verified result or throws PayPalError. Payee-email mismatch
 * is a hard failure (order not for this merchant).
 */
export function verifyCapture(
  order: PayPalOrder,
  expected: { amount: number; currency: string; merchantEmail?: string },
): VerifiedCapture {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0] ?? null;
  const amount = Number.parseFloat(
    capture?.amount?.value ?? unit?.amount?.value ?? "NaN",
  );
  const currency = (capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? "").toUpperCase();

  if (!Number.isFinite(amount) || !currency) {
    throw new PayPalError("PayPal returned an unreadable order. Please try again.");
  }
  const expectedValue = Number(expected.amount.toFixed(2));
  if (Math.abs(amount - expectedValue) > 0.009 || currency !== expected.currency.toUpperCase()) {
    throw new PayPalError(
      `Amount mismatch: PayPal shows ${currency} ${amount.toFixed(2)} but the approved proposal is ${expected.currency} ${expectedValue.toFixed(2)}.`,
      409,
    );
  }
  if (expected.merchantEmail) {
    const payee = unit?.payee?.email_address?.toLowerCase();
    if (payee && payee !== expected.merchantEmail.toLowerCase()) {
      throw new PayPalError("This order is not payable to the expected merchant.", 409);
    }
  }
  return {
    orderId: order.id,
    orderStatus: order.status,
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
    amount,
    currency,
    payerEmail: order.payer?.email_address ?? null,
    payeeEmail: unit?.payee?.email_address ?? null,
  };
}
