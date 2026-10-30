import Link from "next/link";
import { PlusCircle, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { formatMoney, timeAgo } from "@/lib/utils";
import { EmptyProposals } from "@/components/dashboard-shell";
import type { ProposalRow } from "@/lib/types";

const DEMO_ROWS: (ProposalRow & { demo: true })[] = [
  {
    id: "demo-1",
    owner_id: "demo",
    brief_id: null,
    title: "Brand refresh for Fern & Field Café",
    summary: "Logo refresh, menu redesign, and storefront signage concepts.",
    assumptions: [],
    deliverables: [],
    milestones: [],
    price: 2400,
    currency: "USD",
    estimated_timeline: "3 weeks",
    exclusions: [],
    revision_policy: "",
    unresolved: [],
    status: "approved",
    share_token: null,
    approved_version_id: null,
    created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    demo: true,
  },
  {
    id: "demo-2",
    owner_id: "demo",
    brief_id: null,
    title: "Landing page for Northwind Legal",
    summary: "One-page site with intake form and booking integration.",
    assumptions: [],
    deliverables: [],
    milestones: [],
    price: 1800,
    currency: "USD",
    estimated_timeline: "2 weeks",
    exclusions: [],
    revision_policy: "",
    unresolved: [],
    status: "paid",
    share_token: null,
    approved_version_id: null,
    created_at: new Date(Date.now() - 9 * 864e5).toISOString(),
    updated_at: new Date(Date.now() - 864e5).toISOString(),
    demo: true,
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: proposals } = await supabase
    .from("proposals")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);

  const rows = ((proposals ?? []) as ProposalRow[]);
  const showingDemo = rows.length === 0;
  const list: (ProposalRow & { demo?: true })[] = showingDemo ? DEMO_ROWS : rows;

  const open = list.filter((p) => p.status === "draft").length;
  const awaiting = list.filter((p) => p.status === "approved").length;
  const paidTotal = list
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.price), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            002 · Your pipeline
          </p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Good day. Let&apos;s get <em className="text-primary">paid.</em>
          </h1>
        </div>
        <Link
          href="/dashboard/new"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-deep"
        >
          <PlusCircle className="size-4" aria-hidden />
          New proposal
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open proposals", value: String(open), hint: "Drafts in progress" },
          { label: "Awaiting payment", value: String(awaiting), hint: "Approved & shared" },
          {
            label: "Verified paid total",
            value: formatMoney(paidTotal, "USD"),
            hint: "Sandbox-verified captures",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent>
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">
                {kpi.label}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">{kpi.value}</p>
              <p className="mt-0.5 text-xs text-ink-mute">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showingDemo && (
        <p className="rounded-xl border border-dashed border-line-strong bg-white/70 px-4 py-2.5 text-xs text-ink-mute">
          Preview data below is illustrative demo content — it is not stored in
          your account. Create a proposal to see your real pipeline here.
        </p>
      )}

      {rows.length === 0 && !showingDemo ? (
        <EmptyProposals />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id}>
                {"demo" in p ? (
                  <div className="flex items-center gap-4 px-5 py-4 opacity-80" aria-label={`${p.title} (demo preview)`}>
                    <RowBody proposal={p} />
                    <Badge variant="neutral">demo</Badge>
                  </div>
                ) : (
                  <Link
                    href={`/dashboard/proposals/${p.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-parchment"
                  >
                    <RowBody proposal={p} />
                    <ArrowUpRight className="size-4 shrink-0 text-ink-mute" aria-hidden />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function RowBody({ proposal: p }: { proposal: ProposalRow }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{p.title}</p>
        <p className="text-xs text-ink-mute">
          Updated {timeAgo(p.updated_at)} · {p.estimated_timeline || "timeline TBD"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-semibold">
          {formatMoney(Number(p.price), p.currency)}
        </span>
        <StatusBadge status={p.status} />
      </div>
    </div>
  );
}
