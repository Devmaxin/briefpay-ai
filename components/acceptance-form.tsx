"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";

interface AcceptanceFormProps {
  token: string;
  amount: number;
  currency: string;
  onAccept?: () => void;
}

async function api<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string; details?: string };
  } | null;
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.details || json?.error?.message || "Request failed.");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return json.data as T;
}

export function AcceptanceForm({
  token,
  amount,
  currency,
}: AcceptanceFormProps) {
  const [phase, setPhase] = useState<"idle" | "submitting" | "accepted">("idle");
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);

  async function onAccept() {
    setError(null);
    setPhase("submitting");
    try {
      await api<{ already_accepted?: boolean; acceptance: unknown }>(
        "/api/proposals/accept",
        {
          token,
          client_name: clientName.trim() || undefined,
          client_email: clientEmail.trim() || undefined,
          terms_agreed: true,
        },
      );
      onAccept?.();
      setPhase("accepted");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not record your acceptance. Please try again.",
      );
      setPhase("idle");
    }
  }

  if (phase === "accepted") {
    return (
      <div className="rounded-2xl border border-verified/40 bg-verified-soft p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-verified" aria-hidden />
        <h2 className="mt-2 font-display text-2xl font-semibold text-verified">
          Proposal accepted
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Thank you — your acceptance has been recorded. The freelancer will
          be notified.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Accept proposal</h2>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        By accepting, you agree to the scope, timeline, and total of{" "}
        <strong className="font-mono">{formatMoney(amount, currency)}</strong>.
        AI pricing is advisory — your freelancer reviewed and approved this total.
      </p>

      <div className="mt-5 space-y-4">
        <Label htmlFor="client_name">Your name (optional)</Label>
        <Input
          id="client_name"
          type="text"
          placeholder="Jane Doe"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          maxLength={140}
        />

        <Label htmlFor="client_email">Your email (optional)</Label>
        <Input
          id="client_email"
          type="email"
          placeholder="jane@example.com"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          maxLength={254}
        />

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-parchment p-4 text-sm">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => setTermsAgreed(e.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            I have reviewed this proposal and agree to the scope, timeline,
            revisions, and total above.
          </span>
        </label>

        {!termsAgreed && (
          <p className="mt-2 text-sm text-ink-mute">
            Please agree to the terms to accept the proposal.
          </p>
        )}

        <FormError message={error} />

        <Button
          type="button"
          onClick={onAccept}
          disabled={phase === "submitting" || !termsAgreed}
          loading={phase === "submitting"}
          className="w-full"
        >
          {phase === "submitting" ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Recording acceptance…
            </>
          ) : (
            "Accept proposal"
          )}
        </Button>
      </div>
    </div>
  );
}
