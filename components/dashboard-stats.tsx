import { BadgeCheck } from "lucide-react";
import { formatCurrencyTotals, type Counts, type CurrencyTotal } from "@/lib/dashboard-stats";
import { formatMoney } from "@/lib/utils";

function Stat({
  label,
  hint,
  value,
  error,
  tone = "default",
}: {
  label: string;
  hint: string;
  value: string[];
  error: string | null;
  tone?: "default" | "verified";
}) {
  return (
    <div className="bg-white px-4 py-4 sm:px-5 sm:py-5">
      <dt className="font-mono text-[10px] tracking-[0.1em] text-ink-mute uppercase sm:text-[11px]">
        {label}
      </dt>
      <dd className="mt-1.5">
        {error ? (
          <span className="font-display text-2xl font-semibold text-ink-mute" title={error}>
            —
          </span>
        ) : (
          value.map((line) => (
            <span
              key={line}
              className={
                tone === "verified"
                  ? "block font-display text-2xl font-semibold tracking-tight text-verified sm:text-[1.7rem]"
                  : "block font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.7rem]"
              }
            >
              {line}
            </span>
          ))
        )}
        <span className="mt-1 block text-xs leading-snug text-ink-mute">{hint}</span>
      </dd>
    </div>
  );
}

export function DashboardStats({
  counts,
  countsError,
  verified,
  paymentsError,
  currency,
  hasPayments,
}: {
  counts: Counts;
  countsError: string | null;
  verified: CurrencyTotal[];
  paymentsError: string | null;
  currency: string;
  hasPayments: boolean;
}) {
  const paidLines = hasPayments ? formatCurrencyTotals(verified) : [formatMoney(0, currency)];

  return (
    <section aria-labelledby="pipeline-stats">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="pipeline-stats" className="sr-only">
          Pipeline statistics
        </h2>
        <p className="font-mono text-[10px] tracking-[0.12em] text-ink-mute uppercase">
          Live from your account
        </p>
        {paymentsError ? null : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-verified">
            <BadgeCheck className="size-3.5" aria-hidden />
            Only verified captures are counted
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line shadow-[var(--shadow-card)] sm:grid-cols-4">
        <Stat
          label="Total proposals"
          hint="All time"
          value={countsError ? [] : [String(counts.total)]}
          error={countsError}
        />
        <Stat
          label="Open"
          hint="Drafts in progress"
          value={countsError ? [] : [String(counts.open)]}
          error={countsError}
        />
        <Stat
          label="Awaiting payment"
          hint="Approved, not paid yet"
          value={countsError ? [] : [String(counts.awaitingPayment)]}
          error={countsError}
        />
        <Stat
          label="Verified paid"
          hint={paymentsError ? "Totals unavailable" : "PayPal captures verified server-side"}
          value={paidLines}
          error={paymentsError}
          tone="verified"
        />
      </dl>
      {(countsError || paymentsError) && (
        <p role="status" className="mt-2 text-xs text-caution">
          {countsError ?? paymentsError}
        </p>
      )}
    </section>
  );
}
