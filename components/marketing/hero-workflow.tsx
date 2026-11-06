import type { CSSProperties } from "react";
import {
  BadgeCheck,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

const CLIENT_MESSAGE =
  "Hey! I need a website for my bakery ASAP. Something modern, with an online cake ordering feature. Can you help? Let me know the cost.";

function TypedMessage() {
  return (
    <p className="relative text-sm leading-relaxed text-ink-soft italic">
      <span>
        {[...CLIENT_MESSAGE].map((char, index) =>
          char === " " ? (
            <span key={index}> </span>
          ) : (
            <span
              key={index}
              className="hero-char"
              style={{ animationDelay: `${620 + index * 11}ms` }}
            >
              {char}
            </span>
          ),
        )}
        <span className="hero-caret" aria-hidden />
      </span>
    </p>
  );
}

function StageRail() {
  return (
    <div
      aria-hidden
      className="relative mx-auto mb-4 hidden h-7 w-full max-w-3xl items-center md:flex"
    >
      <span className="stage-rail-line absolute inset-x-0 top-1/2 h-px origin-left bg-gradient-to-r from-primary/40 via-ai/40 to-verified/50" />
      <div className="relative flex w-full items-center justify-between">
        {["001", "002", "003"].map((step) => (
          <span
            key={step}
            className="grid size-7 place-items-center rounded-full border border-line-strong bg-white font-mono text-[10px] font-medium text-ink-mute shadow-[0_1px_2px_rgb(22_33_59/0.05)]"
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeroWorkflow() {
  return (
    <div
      className="mt-12 w-full text-left"
      aria-label="Illustrative workflow from a client request to a verified Sandbox payment"
    >
      <StageRail />

      <div className="relative grid gap-4 md:grid-cols-3">
        {/* 001 — the client request */}
        <Card
          className="hero-enter group relative h-full overflow-hidden transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-pop)]"
          style={{ "--hero-delay": "360ms" } as CSSProperties}
        >
          <CardContent className="flex h-full flex-col pt-5">
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-ink-mute uppercase">
              <MessagesSquare className="size-3.5 text-primary" aria-hidden />
              001 · The client request
            </p>
            <div className="mt-3 flex min-h-[7.25rem] flex-col justify-center rounded-xl bg-parchment p-4">
              <TypedMessage />
            </div>
            <p className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-ink-mute">
              <span className="size-1.5 rounded-full bg-ink-mute/50" aria-hidden />
              A real project can start with an unclear request.
            </p>
          </CardContent>
        </Card>

        {/* 002 — the proposal */}
        <Card
          className="hero-enter group relative h-full overflow-hidden border-ai/30 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-ai/50 hover:shadow-[var(--shadow-pop)]"
          style={{ "--hero-delay": "500ms" } as CSSProperties}
        >
          <CardContent className="flex h-full flex-col pt-5">
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
              <Sparkles className="size-3.5" aria-hidden />
              002 · Your proposal
            </p>
            <div className="relative mt-3 min-h-[7.25rem] flex-1 rounded-xl bg-ai-soft/60 p-4 text-sm">
              <div
                aria-hidden
                className="hero-pending absolute inset-4 flex flex-col justify-center gap-2 text-ink-soft"
              >
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase">
                  Reading the brief
                </span>
                <span className="flex items-center gap-1">
                  <span className="thinking-dot" />
                  <span className="thinking-dot [animation-delay:160ms]" />
                  <span className="thinking-dot [animation-delay:320ms]" />
                </span>
              </div>
              <div className="hero-ready">
                <p className="font-display font-semibold">
                  Bakery Website &amp; Online Cake Ordering
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                  <li>Homepage, menu and ordering experience</li>
                  <li>Two design concepts</li>
                  <li>Three-week estimated timeline</li>
                </ul>
                <p className="mt-2 flex items-baseline gap-2 font-mono text-sm font-semibold">
                  {formatMoney(1800, "USD")}
                  <span className="font-sans text-[10px] font-medium tracking-wide text-ink-soft uppercase">
                    AI-assisted draft
                  </span>
                </p>
              </div>
            </div>
            <p className="mt-auto pt-3 text-xs text-ink-mute">
              Review the scope, adjust the details, and approve the final
              proposal.
            </p>
          </CardContent>
        </Card>

        {/* 003 — payment confirmation */}
        <Card
          className="hero-enter group relative h-full overflow-hidden border-verified/30 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-verified/50 hover:shadow-[var(--shadow-pop)]"
          style={{ "--hero-delay": "640ms" } as CSSProperties}
        >
          <CardContent className="flex h-full flex-col pt-5">
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-verified uppercase">
              <BadgeCheck className="size-3.5" aria-hidden />
              003 · Payment confirmation
            </p>
            <div className="relative mt-3 min-h-[7.25rem] flex-1 rounded-xl bg-verified-soft p-4 text-sm">
              <div
                aria-hidden
                className="hero-pending hero-pending-late absolute inset-4 flex flex-col justify-center gap-1 text-ink-soft"
              >
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase">
                  Awaiting capture
                </span>
                <span className="text-xs">Server verifies every field first.</span>
              </div>
              <div className="hero-ready hero-ready-late">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono font-semibold text-verified">
                    PAYMENT CAPTURED · {formatMoney(1800, "USD")}
                  </p>
                  <Badge variant="paid">Verified</Badge>
                </div>
                <p className="mt-1.5 text-ink-soft">
                  Verified against the approved proposal.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  Illustrative example. Payments in this deployment use PayPal
                  Sandbox.
                </p>
              </div>
            </div>
            <p className="mt-auto pt-3 text-xs text-ink-mute">
              Payment status confirmed by the server.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
