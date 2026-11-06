"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  FileText,
  LockKeyhole,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal, useInView } from "@/components/marketing/reveal";
import { formatMoney } from "@/lib/utils";

const DELIVERABLES = [
  {
    title: "Homepage & menu pages",
    body: "A new editorial layout with photography-ready sections and a mobile-first menu.",
  },
  {
    title: "Cake pre-order form",
    body: "Date picker, pickup options, order summary, and automatic email confirmations.",
  },
  {
    title: "Launch & handover",
    body: "Deployed and tested, with a 30-minute walkthrough and a short handover guide.",
  },
];

function step(delay: number): CSSProperties {
  return { "--sample-delay": `${delay}ms` } as CSSProperties;
}

export function SampleProposal() {
  const { ref, inView } = useInView<HTMLDivElement>({
    once: false,
    threshold: 0.12,
    rootMargin: "0px 0px -8% 0px",
  });

  return (
    <section
      id="sample"
      className="mx-auto w-full max-w-3xl scroll-mt-28 px-4 py-16 sm:px-6"
    >
      <Reveal>
        <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
          Sample proposal
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          What your client <em className="text-primary">sees.</em>
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
          A focused document with the scope, timeline, and price decided up
          front — then a single acceptance step and a verified Sandbox payment.
        </p>
      </Reveal>

      <div
        ref={ref}
        data-sample={inView ? "in" : "out"}
        className="proposal-paper mt-8 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-pop)] sm:p-9"
      >
        <div className="sample-settle">
          <div
            className="sample-anim flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-4"
            style={step(0)}
          >
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.12em] text-ink-mute uppercase">
              <FileText className="size-3.5" aria-hidden />
              Proposal · v1 · Sample
            </p>
            <Badge variant="neutral">Demo data</Badge>
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="sample-anim" style={step(80)}>
              <p className="font-mono text-[10px] tracking-[0.12em] text-ink-mute uppercase">
                Prepared for
              </p>
              <p className="mt-1 text-sm font-medium">Fern &amp; Field Bakery</p>
            </div>
            <div className="sample-anim text-right" style={step(120)}>
              <p className="font-mono text-[10px] tracking-[0.12em] text-ink-mute uppercase">
                Prepared by
              </p>
              <p className="mt-1 text-sm font-medium">Your studio</p>
            </div>
          </div>

          <h3
            className="sample-anim mt-6 font-display text-2xl font-semibold sm:text-3xl"
            style={step(160)}
          >
            Bakery Website &amp; Online Cake Ordering
          </h3>
          <p
            className="sample-anim mt-3 leading-relaxed text-ink-soft"
            style={step(220)}
          >
            A modern, mobile-first website for Fern &amp; Field Bakery with a
            browsable menu and a simple cake pre-order flow, ready before the
            holiday rush.
          </p>

          <h4
            className="sample-anim mt-7 font-mono text-[11px] font-semibold tracking-[0.12em] text-primary-deep uppercase"
            style={step(280)}
          >
            Deliverables
          </h4>
          <ul className="mt-2 space-y-1">
            {DELIVERABLES.map((item, index) => (
              <li
                key={item.title}
                className="sample-anim group/item rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-parchment-deep/60"
                style={step(320 + index * 80)}
              >
                <p className="flex items-start gap-2 text-[15px]">
                  <BadgeCheck
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>
                    <strong className="font-semibold">{item.title}</strong>{" "}
                    <span className="text-ink-soft">— {item.body}</span>
                  </span>
                </p>
              </li>
            ))}
          </ul>

          <div
            className="sample-anim mt-6 grid gap-4 rounded-2xl bg-parchment p-5 sm:grid-cols-3"
            style={step(600)}
          >
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-ink-mute uppercase">
                <CalendarDays className="size-3.5" aria-hidden />
                Timeline
              </p>
              <p className="mt-1 font-medium">3 weeks</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-ink-mute uppercase">
                <RotateCcw className="size-3.5" aria-hidden />
                Revisions
              </p>
              <p className="mt-1 text-sm">Two rounds included</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-ink-mute uppercase">
                <Wallet className="size-3.5" aria-hidden />
                Payment
              </p>
              <p className="mt-1 text-sm">PayPal Sandbox</p>
            </div>
          </div>

          <div
            className="sample-anim mt-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-primary/15 bg-primary-ink/50 px-5 py-4"
            style={step(700)}
          >
            <div>
              <p className="font-mono text-[10px] tracking-[0.08em] text-primary-deep uppercase">
                Total due
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-tight">
                {formatMoney(1800, "USD")}
              </p>
            </div>
            <p className="max-w-[15rem] text-xs leading-relaxed text-ink-mute">
              Fixed for this version. Editing the proposal creates a new version
              and a fresh approval.
            </p>
          </div>

          <div
            className="sample-anim mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-parchment/70 px-4 py-3 text-xs leading-relaxed text-ink-soft"
            style={step(780)}
          >
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-verified" aria-hidden />
            <p>
              The client accepts this frozen version, then pays through PayPal
              Sandbox. This sample is illustrative — no acceptance or payment is
              recorded.
            </p>
          </div>

          <Link
            href="/signup"
            className="sample-anim mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-ink-soft"
            style={step(860)}
          >
            <FileText className="size-4" aria-hidden />
            Create one like this
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
