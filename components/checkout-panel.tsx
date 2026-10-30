"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { loadScript } from "@paypal/paypal-js";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

type Phase =
  | { name: "terms" }
  | { name: "ready" }
  | { name: "approving" }
  | { name: "capturing" }
  | { name: "success"; captureId: string | null }
  | { name: "pending" }
  | { name: "failed"; message: string }
  | { name: "canceled" };

async function api<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Both checkout routes use POST.
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean; data?: T; error?: { message?: string; details?: string };
  } | null;
  if (!res.ok || !json?.ok) {
    const err = new Error(json?.error?.details || json?.error?.message || "Payment failed.");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return json.data as T;
}

export function CheckoutPanel({
  token, amount, currency, clientId, proposalPaid,
}: {
  token: string;
  amount: number;
  currency: string;
  clientId: string;
  proposalPaid: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const [phase, setPhase] = useState<Phase>(proposalPaid ? { name: "success", captureId: null } : { name: "terms" });
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase.name !== "ready" || !buttonsRef.current) return;
    let cancelled = false;
    buttonsRef.current.innerHTML = "";
    loadScript({ clientId, currency, intent: "capture", components: "buttons" })
      .then(async (paypal) => {
        if (cancelled || !paypal?.Buttons || !buttonsRef.current) return;
        const buttons = paypal.Buttons({
          style: { layout: "vertical", color: "blue", shape: "pill", label: "paypal" },
          createOrder: async () => {
            const { order_id } = await api<{ order_id: string }>("/api/checkout/orders", { token });
            return order_id;
          },
          onApprove: async (data) => {
            setPhase({ name: "capturing" });
            try {
              const res = await fetch("/api/checkout/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, order_id: data.orderID }),
              });
              const json = (await res.json().catch(() => null)) as {
                ok?: boolean; data?: { status?: string; capture_id?: string | null };
                error?: { message?: string; details?: string };
              } | null;
              if (!res.ok || !json?.ok) {
                throw new Error(json?.error?.details || json?.error?.message || "Capture failed.");
              }
              if (json.data?.status === "pending") setPhase({ name: "pending" });
              else setPhase({ name: "success", captureId: json.data?.capture_id ?? null });
            } catch (e) {
              setPhase({ name: "failed", message: e instanceof Error ? e.message : "Capture failed." });
            }
          },
          onCancel: () => setPhase({ name: "canceled" }),
          onError: () => setPhase({ name: "failed", message: "The PayPal checkout encountered an error. Please try again." }),
        });
        await buttons.render(buttonsRef.current).catch(() => {
          if (!cancelled) setPhase({ name: "failed", message: "Could not load the PayPal buttons. Check your connection and try again." });
        });
      })
      .catch(() => {
        if (!cancelled) setPhase({ name: "failed", message: "Could not load PayPal. Check your connection and try again." });
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name === "ready" ? "ready" : "idle"]);

  if (proposalPaid || phase.name === "success") {
    const captureId = phase.name === "success" ? phase.captureId : null;
    return (
      <div role="status" className="rounded-2xl border border-verified/40 bg-verified-soft p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-verified" aria-hidden />
        <h2 className="mt-2 font-display text-2xl font-semibold text-verified">Payment verified</h2>
        <p className="mt-1 font-mono text-lg font-semibold">
          {formatMoney(amount, currency)}
        </p>
        {captureId && <p className="mt-1 font-mono text-xs text-ink-soft">Capture {captureId}</p>}
        <p className="mt-2 text-sm text-ink-soft">
          Verified server-side against the approved proposal. The freelancer has been notified in their dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Accept &amp; pay</h2>
        <Badge variant="sandbox">PayPal Sandbox</Badge>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-parchment p-4 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked && phase.name === "terms") setPhase({ name: "ready" });
          }}
          className="mt-1 size-4 accent-primary"
        />
        <span>
          I accept this proposal&apos;s scope, timeline, and total of{" "}
          <strong className="font-mono">{formatMoney(amount, currency)}</strong>.
          I understand payment is processed by PayPal and BriefPay holds no funds.
        </span>
      </label>

      {!accepted && (
        <p className="mt-3 text-sm text-ink-mute">Tick the acceptance box to enable checkout.</p>
      )}

      {accepted && (phase.name === "terms" || phase.name === "ready") && (
        <>
          <div ref={buttonsRef} className="mt-4 min-h-[120px]" aria-live="polite" />
          {!clientId && (
            <FormError message="PayPal is not configured (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID). The freelancer must configure Sandbox credentials." />
          )}
        </>
      )}

      {phase.name === "approving" || phase.name === "capturing" ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="animate-spin" aria-hidden />
          {phase.name === "capturing" ? "Verifying payment with PayPal…" : "Waiting for PayPal approval…"}
        </p>
      ) : null}

      {phase.name === "pending" && (
        <div role="status" className="mt-4 rounded-xl border border-caution/40 bg-caution-soft p-4 text-sm text-caution">
          <strong>Payment pending.</strong> PayPal is still processing this payment.
          The freelancer&apos;s dashboard will update once it clears — nothing else is needed from you.
        </div>
      )}

      {phase.name === "canceled" && (
        <div className="mt-4">
          <p role="status" className="text-sm text-ink-soft">Checkout was canceled. No charge was made.</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => setPhase({ name: "ready" })}>
            Try again
          </Button>
        </div>
      )}

      {phase.name === "failed" && (
        <div className="mt-4">
          <FormError message={phase.message} />
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => setPhase({ name: "ready" })}>
            Try again
          </Button>
        </div>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-xs text-ink-mute">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Sandbox demo: use a PayPal Sandbox buyer account. Server verifies order,
        capture, amount, and currency before marking anything paid.
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-ink-mute">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        AI pricing is advisory only — your freelancer reviewed and approved this total.
      </p>
    </div>
  );
}
