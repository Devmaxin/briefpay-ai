"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatMoney, timeAgo } from "@/lib/utils";
import type { ProposalRow } from "@/lib/types";

type Filter = "all" | "draft" | "approved" | "paid";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
];

export function ProposalList({ rows }: { rows: ProposalRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (q && !`${p.title} ${p.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-mute" />
          <Input
            type="search"
            aria-label="Search proposals"
            placeholder="Search by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                filter === f.value
                  ? "bg-ink text-white"
                  : "border border-line-strong bg-white text-ink-soft hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-mute">
            No proposals match. Try a different search or filter.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/proposals/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-parchment"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{p.title}</span>
                      <span className="block text-xs text-ink-mute">
                        Updated {timeAgo(p.updated_at)} · {p.estimated_timeline || "timeline TBD"}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-sm font-semibold">
                        {formatMoney(Number(p.price), p.currency)}
                      </span>
                      <StatusBadge status={p.status} />
                    </span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-ink-mute" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function DemoProposalList({ rows }: { rows: (ProposalRow & { demo: true })[] }) {
  return (
    <Card>
      <ul className="divide-y divide-line">
        {rows.map((p) => (
          <li key={p.id}>
            <div
              className="flex items-center gap-4 px-5 py-4 opacity-80"
              aria-label={`${p.title} (demo preview)`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{p.title}</span>
                  <span className="block text-xs text-ink-mute">
                    Updated {timeAgo(p.updated_at)} · {p.estimated_timeline}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm font-semibold">
                    {formatMoney(Number(p.price), p.currency)}
                  </span>
                  <StatusBadge status={p.status} />
                </span>
              </span>
              <Badge variant="neutral">demo</Badge>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
