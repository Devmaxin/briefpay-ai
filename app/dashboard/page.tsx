import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { firstName } from "@/lib/identity";
import { DashboardStats } from "@/components/dashboard-stats";
import { ProposalList } from "@/components/proposal-list";
import { EmptyProposals } from "@/components/dashboard-shell";

// Session-scoped data — render per request.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [profile, data] = await Promise.all([getProfile(user.id), getDashboardData()]);
  const name = firstName(profile?.full_name, user.email);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            Workspace
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-[2.4rem] sm:leading-[1.1]">
            Welcome back, <em className="text-primary">{name}</em>.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mute">
            Your pipeline in one place: every brief, approved proposal, and
            verified PayPal payment.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
        >
          <PlusCircle className="size-4" aria-hidden />
          New proposal
        </Link>
      </header>

      <DashboardStats
        counts={data.counts}
        countsError={data.countsError}
        verified={data.verified}
        paymentsError={data.paymentsError}
        currency={data.currency}
        hasPayments={data.verified.length > 0}
      />

      <section aria-labelledby="recent-proposals" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="recent-proposals"
              className="font-display text-2xl font-semibold tracking-tight"
            >
              Recent proposals
            </h2>
            <p className="text-sm text-ink-mute">
              Most recently updated first
              {data.proposals.length >= 20 ? " · showing the latest 20" : ""}.
            </p>
          </div>
          {data.proposals.length > 0 && (
            <p className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">
              {data.proposals.length} shown
            </p>
          )}
        </div>

        {data.proposalsError ? (
          <div
            role="alert"
            className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft px-5 py-4"
          >
            <p className="text-sm font-semibold text-danger">
              We could not load your proposals
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">{data.proposalsError}</p>
            <Link
              href="/dashboard"
              className="mt-2 inline-block text-sm font-semibold text-danger underline underline-offset-2"
            >
              Try again
            </Link>
          </div>
        ) : data.proposals.length === 0 ? (
          <EmptyProposals />
        ) : (
          <ProposalList rows={data.proposals} />
        )}
      </section>
    </div>
  );
}
