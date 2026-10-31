"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { formatMoney, timeAgo } from "@/lib/utils";
import { proposalAmount } from "@/lib/dashboard-stats";
import type { DashboardProposal } from "@/lib/types";

type Filter = "all" | "draft" | "approved" | "paid";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  approved: "Awaiting payment",
  paid: "Paid",
};

export function ProposalList({ rows }: { rows: DashboardProposal[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      const haystack = [p.title, p.summary, p.client_name, p.project_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-mute"
          />
          <Input
            type="search"
            aria-label="Search proposals"
            placeholder="Search by title or client…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`min-h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                filter === item.value
                  ? "bg-ink text-white"
                  : "border border-line-strong bg-white text-ink-soft hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-mute">
            No proposals match. Try a different search or filter.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((proposal) => (
              <li key={proposal.id}>
                <Link
                  href={`/dashboard/proposals/${proposal.id}`}
                  aria-label={`Open ${proposal.title}`}
                  className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-parchment sm:px-5"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink group-hover:text-primary">
                        {proposal.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-mute">
                        {proposal.client_name?.trim() || "Client not recorded"}
                        {" · "}
                        <span title={new Date(proposal.updated_at).toLocaleString()}>
                          Updated {timeAgo(proposal.updated_at)}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-ink">
                        {formatMoney(proposalAmount(proposal), proposal.currency)}
                      </span>
                      <StatusBadge
                        status={proposal.status}
                        label={STATUS_LABEL[proposal.status] ?? proposal.status}
                      />
                    </span>
                  </span>
                  <ArrowUpRight
                    className="mt-1 size-4 shrink-0 text-ink-mute transition-colors group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
