"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { FormError, Input, Label, Textarea } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import type { ProposalRow } from "@/lib/types";

type ProposalVersion = {
  id: string;
  version_number: number;
  source: "ai" | "user" | null;
  change_summary: string | null;
  created_at: string;
};

async function api<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string; details?: string };
  } | null;
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error?.details || json?.error?.message || "Request failed.");
  }
  return json.data as T;
}

export function ProposalEditor({ id }: { id: string }) {
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalRow | null>(null);
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    price: "",
    currency: "USD",
    estimated_timeline: "",
    revision_policy: "",
    deliverables: "",
    milestones: "",
    exclusions: "",
  });
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    api<{ proposal: ProposalRow; versions: ProposalVersion[] }>(
      `/api/proposals/${id}`,
      "GET",
    )
      .then(({ proposal: p, versions: v }) => {
        setProposal(p);
        setVersions((v ?? []).sort((a, b) => b.version_number - a.version_number));
        setForm({
          title: p.title,
          summary: p.summary,
          price: String(Number(p.price)),
          currency: p.currency,
          estimated_timeline: p.estimated_timeline,
          revision_policy: p.revision_policy,
          deliverables: p.deliverables
            .map((d) => `${d.title}${d.description ? ` — ${d.description}` : ""}`)
            .join("\n"),
          milestones: p.milestones
            .map((m) => `${m.title}${m.duration ? ` (${m.duration})` : ""}`)
            .join("\n"),
          exclusions: p.exclusions.join("\n"),
        });
        if (p.share_token) setShareUrl(`${window.location.origin}/p/${p.share_token}`);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function parseLines(text: string) {
    return text.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  function toRelativePath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  /** True when the latest saved state is still the AI-generated draft. */
  const isAiSuggested =
    versions.length > 0 && versions[0]?.source === "ai" && proposal?.status === "draft";

  async function save() {
    if (!proposal) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const deliverables = parseLines(form.deliverables).map((line) => {
        const [title, ...rest] = line.split("—");
        return { title: title.trim(), description: rest.join("—").trim() };
      });
      const { proposal: updated, approval_invalidated } = await api<{
        proposal: ProposalRow;
        approval_invalidated: boolean;
      }>(`/api/proposals/${id}`, "PATCH", {
        title: form.title.trim(),
        summary: form.summary.trim(),
        deliverables,
        milestones: parseLines(form.milestones).map((line) => {
          const m = line.match(/^(.*?)(?:\(([^)]+)\))?$/);
          return {
            title: (m?.[1] ?? line).trim(),
            description: "",
            duration: (m?.[2] ?? "").trim(),
          };
        }),
        exclusions: parseLines(form.exclusions),
        estimated_timeline: form.estimated_timeline.trim(),
        price: Number(form.price),
        currency: form.currency.trim().toUpperCase(),
        revision_policy: form.revision_policy.trim(),
      });
      setProposal(updated);
      setSaved(true);
      // Refresh versions so the new user-created version shows in history.
      api<{ versions: ProposalVersion[] }>(`/api/proposals/${id}`, "GET")
        .then(({ versions: v }) => {
          setVersions(
            (v ?? []).sort((a, b) => b.version_number - a.version_number),
          );
        })
        .catch(() => {});
      if (approval_invalidated) {
        setShareUrl(`${window.location.origin}/p/${updated.share_token}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setError(null);
    setApproving(true);
    try {
      const { share_url } = await api<{ share_url: string }>(
        `/api/proposals/${id}`,
        "POST",
      );
      setShareUrl(`${window.location.origin}${share_url}`);
      const { proposal: updated } = await api<{ proposal: ProposalRow }>(
        `/api/proposals/${id}`,
        "GET",
      );
      setProposal(updated);
      api<{ versions: ProposalVersion[] }>(`/api/proposals/${id}`, "GET")
        .then(({ versions: v }) => {
          setVersions(
            (v ?? []).sort((a, b) => b.version_number - a.version_number),
          );
        })
        .catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-ink-mute">
        <Loader2 className="animate-spin" aria-hidden /> Loading proposal…
      </p>
    );
  }
  if (!proposal) {
    return (
      <div className="flex flex-col gap-3">
        <FormError message={error ?? "Proposal not found."} />
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const previewPrice = Number(form.price) || 0;
  const previewCurrency = (form.currency || "USD").toUpperCase();
  const latestVersion = versions[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Dashboard
        </button>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            003 · Proposal editor
          </p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {proposal.title}
          </h1>
        </div>
        <div className="flex gap-2 md:hidden" role="tablist" aria-label="Editor view">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t ? "bg-ink text-white" : "border border-line-strong bg-white"}`}
            >
              {t === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {isAiSuggested && (
        <div
          className="rounded-xl border border-ai/30 bg-ai-soft px-5 py-3.5 flex items-center gap-3"
        >
          <Sparkles className="size-4 text-ai" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ai">
              AI-suggested draft — review and adjust before approving.
            </p>
            <p className="mt-0.5 text-xs text-ink-mute">
              Everything above was generated from your brief. It is advisory —
              you must explicitly review and approve the final price and scope.
            </p>
          </div>
        </div>
      )}

      {!isAiSuggested && versions.length > 0 && latestVersion && (
        <div
          className="rounded-xl border border-line bg-white px-5 py-3.5 flex items-center gap-3"
        >
          <Clock className="size-4 text-ink-mute" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">
              Version {latestVersion.version_number} ·{" "}
              {latestVersion.source === "user" ? "Edited by you" : "AI-generated"}
            </p>
            <p className="mt-0.5 text-xs text-ink-mute">
              {latestVersion.change_summary ?? ""} ·{" "}
              {new Date(latestVersion.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-verified/30 bg-verified-soft px-4 py-2.5 text-sm text-verified">
          <CheckCircle2 className="size-4" aria-hidden /> Changes saved.
        </p>
      )}
      <FormError message={error} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Edit column */}
        <div className={`${tab === "edit" ? "block" : "hidden"} md:block`}>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  maxLength={140}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={form.summary}
                  rows={4}
                  maxLength={2000}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="deliverables">Deliverables (one per line, “Title — detail”)</Label>
                <Textarea
                  id="deliverables"
                  value={form.deliverables}
                  rows={4}
                  onChange={(e) => setForm({ ...form, deliverables: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="milestones">Milestones (one per line, “Title (duration)”)</Label>
                <Textarea
                  id="milestones"
                  value={form.milestones}
                  rows={3}
                  onChange={(e) => setForm({ ...form, milestones: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="exclusions">Exclusions (one per line)</Label>
                <Textarea
                  id="exclusions"
                  value={form.exclusions}
                  rows={3}
                  onChange={(e) => setForm({ ...form, exclusions: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="cur">Currency</Label>
                  <Input
                    id="cur"
                    value={form.currency}
                    maxLength={3}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    className="font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  value={form.estimated_timeline}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, estimated_timeline: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="revisions">Revision policy</Label>
                <Textarea
                  id="revisions"
                  value={form.revision_policy}
                  rows={2}
                  maxLength={600}
                  onChange={(e) => setForm({ ...form, revision_policy: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={save} loading={saving}>
                  Save changes
                </Button>
                {proposal.status !== "paid" && (
                  <Button variant="secondary" onClick={approve} loading={approving}>
                    <Sparkles aria-hidden />
                    {proposal.status === "approved" ? "Re-approve & refresh link" : "Approve & get share link"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview column */}
        <div className={`${tab === "preview" ? "block" : "hidden"} md:block`}>
          <div className="proposal-paper rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
            <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
              BriefPay proposal · Preview
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              {form.title || "Untitled"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{form.summary}</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                  Deliverables
                </dt>
                <dd className="mt-1">
                  <ul className="list-disc space-y-1 pl-5">
                    {parseLines(form.deliverables).map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                  Total
                </dt>
                <dd className="mt-1 font-mono text-xl font-semibold">
                  {formatMoney(previewPrice, previewCurrency)}
                </dd>
              </div>
            </dl>
          </div>

          {shareUrl && proposal.status === "approved" && (
            <Card className="mt-4 border-primary/30 bg-primary-ink/40">
              <CardContent className="flex flex-col gap-2 pt-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary-deep">
                  <CheckCircle2 className="size-4" aria-hidden /> Approved — share this link with your client
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs">
                    {shareUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                  >
                    <Copy aria-hidden /> Copy
                  </Button>
                  <Link
                    href={toRelativePath(shareUrl)}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-line-strong bg-white px-3 text-[13px] font-semibold"
                  >
                    Open <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </div>
                <p className="text-xs text-ink-mute">
                  Editing after approval invalidates this link&apos;s checkout session.
                </p>
              </CardContent>
            </Card>
          )}
          {proposal.status === "paid" && (
            <p className="mt-4 rounded-xl border border-verified/30 bg-verified-soft px-4 py-3 text-sm text-verified">
              This proposal has been paid (Sandbox-verified). It is now locked.
            </p>
          )}
        </div>
      </div>

      {/* Version history */}
      {versions.length > 1 && (
        <Card className="mt-2">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-4 text-ink-mute" aria-hidden />
              <h3 className="font-semibold text-ink">Version history</h3>
            </div>
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li key={v.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      Version {v.version_number}{" "}
                      {v.source === "ai" ? (
                        <Badge variant="ai" className="ml-2">AI draft</Badge>
                      ) : v.source === "user" ? (
                        <Badge variant="neutral" className="ml-2">Your edit</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-ink-mute">
                      {v.change_summary ?? ""}
                      {v.created_at && (
                        <span> · {new Date(v.created_at).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
