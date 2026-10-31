/**
 * Pure dashboard math. No database or framework imports, so the numbers
 * that appear on screen can be unit tested without credentials.
 */
import { formatMoney } from "./utils.ts";

export interface ProposalState {
  status: string;
  price?: number | string | null;
  final_price?: number | null;
  currency?: string | null;
}

export interface PaymentState {
  amount: number | string;
  currency: string;
  status: string;
}

export interface Counts {
  total: number;
  open: number;
  awaitingPayment: number;
  paid: number;
}

export interface CurrencyTotal {
  currency: string;
  total: number;
}

const DEFAULT_CURRENCY = "USD";

function normaliseCurrency(value?: string | null): string {
  const code = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY;
}

function toAmount(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** The amount shown to the freelancer: frozen final price once approved. */
export function proposalAmount(proposal: ProposalState): number {
  if (proposal.final_price !== null && proposal.final_price !== undefined) {
    return toAmount(proposal.final_price);
  }
  return toAmount(proposal.price);
}

/**
 * Status definitions, kept in one place:
 *  - open            → draft (still being written)
 *  - awaitingPayment → approved (shared with the client, not paid yet)
 *  - paid            → proposal marked paid
 * Unknown statuses count toward the total only.
 */
export function summariseProposals(proposals: ProposalState[]): Counts {
  const counts: Counts = { total: proposals.length, open: 0, awaitingPayment: 0, paid: 0 };
  for (const p of proposals) {
    if (p.status === "draft") counts.open += 1;
    else if (p.status === "approved") counts.awaitingPayment += 1;
    else if (p.status === "paid") counts.paid += 1;
  }
  return counts;
}

/**
 * Verified revenue. Only `captured` payments count — a PayPal order that
 * was merely created or is pending must never appear as money received.
 */
export function verifiedTotals(payments: PaymentState[]): CurrencyTotal[] {
  const byCurrency = new Map<string, number>();
  for (const payment of payments) {
    if (payment.status !== "captured") continue;
    const currency = normaliseCurrency(payment.currency);
    const amount = toAmount(payment.amount);
    if (amount <= 0) continue;
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
  }
  return [...byCurrency.entries()]
    .map(([currency, total]) => ({
      currency,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Currency used for zero states: the most common one on the account. */
export function primaryCurrency(proposals: ProposalState[]): string {
  const tally = new Map<string, number>();
  for (const p of proposals) {
    const currency = normaliseCurrency(p.currency);
    tally.set(currency, (tally.get(currency) ?? 0) + 1);
  }
  let best = DEFAULT_CURRENCY;
  let bestCount = 0;
  for (const [currency, count] of tally) {
    if (count > bestCount) {
      best = currency;
      bestCount = count;
    }
  }
  return best;
}

/** One formatted string per currency, e.g. ["$1,200.00", "€340.00"]. */
export function formatCurrencyTotals(totals: CurrencyTotal[]): string[] {
  return totals.map((t) => formatMoney(t.total, t.currency));
}
