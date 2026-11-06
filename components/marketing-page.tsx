import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  MessageCircleQuestionMark,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { HeroWorkflow } from "@/components/marketing/hero-workflow";
import { Reveal } from "@/components/marketing/reveal";
import { SampleProposal } from "@/components/marketing/sample-proposal";

const STEPS = [
  {
    n: "001",
    title: "Paste the brief",
    body: "Drop in the client's vague email or DM. No formatting needed — typos and all.",
  },
  {
    n: "002",
    title: "Answer clarifications",
    body: "Groq spots the gaps and asks up to five sharp questions. Answer what you know, skip the rest.",
  },
  {
    n: "003",
    title: "Review and approve",
    body: "Get a structured draft with scope, milestones, exclusions, and an advisory price. You edit and approve every word.",
  },
  {
    n: "004",
    title: "Share and get paid",
    body: "Send a public link. Your client accepts the terms and pays through PayPal Sandbox — verified server-side.",
  },
];

const AI_POINTS = [
  "Scope gaps surfaced before you price the work",
  "One-line rationale with every clarification question",
  "Skipped questions stay visible as unresolved in the draft",
];

const PAYMENT_POINTS = [
  "Order amount and currency read from the database",
  "Every capture verified before a proposal is marked paid",
  "Idempotent retries — never a duplicate payment",
];

const FAQS = [
  {
    q: "Is this real money?",
    a: "No. This deployment is connected to PayPal Sandbox with test buyer and seller accounts. Payments are simulated, no real funds move, and every checkout is labelled as a Sandbox demo.",
  },
  {
    q: "Does BriefPay hold funds or offer escrow?",
    a: "No. BriefPay never holds funds, provides escrow, or guarantees delivery. Payment goes through PayPal, and the dashboard only reflects server-verified captures.",
  },
  {
    q: "How accurate is the AI pricing?",
    a: "It is advisory, not a guarantee. Groq suggests a starting price from the brief, but you must review and approve the final amount before sharing anything with a client.",
  },
  {
    q: "What happens if I edit a proposal after sharing it?",
    a: "Editing an approved proposal invalidates the previous approval and supersedes any unpaid checkout session, so a client can never pay for stale terms. Re-approve to issue a fresh link.",
  },
  {
    q: "Can my client pay without an account?",
    a: "Yes. The public link is the client's entire experience: they read the frozen proposal, accept the terms, and continue to PayPal Sandbox. No BriefPay account is required.",
  },
  {
    q: "What do I need to get started?",
    a: "A free account and a client request. You can draft, edit, approve, and share proposals in the product. This deployment uses PayPal Sandbox for the payment step while live payments are not enabled.",
  },
];

function HeroDelay(delay: number): CSSProperties {
  return { "--hero-delay": `${delay}ms` } as CSSProperties;
}

export function MarketingPage() {
  return (
    <div className="flex flex-col">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-white/60 to-transparent"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24">
          <div
            className="hero-enter flex flex-wrap items-center justify-center gap-2"
            style={HeroDelay(0)}
          >
            <Badge variant="ai">
              <Sparkles className="size-3.5" aria-hidden />
              Proposal-to-payment workflow
            </Badge>
            <Badge variant="sandbox">PayPal Sandbox</Badge>
          </div>

          <h1
            className="hero-enter mt-5 max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
            style={HeroDelay(80)}
          >
            Turn vague client requests into{" "}
            <em className="text-primary">proposals that get paid.</em>
          </h1>

          <p
            className="hero-enter mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft"
            style={HeroDelay(160)}
          >
            BriefPay AI helps freelancers clarify messy requirements, prepare
            professional proposals, and collect payments through PayPal — one
            calm workflow from unclear scope to verified payment.
          </p>

          <div
            className="hero-enter mt-8 flex flex-wrap items-center justify-center gap-3"
            style={HeroDelay(240)}
          >
            <Link
              href="/signup"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgb(36_86_224/0.6)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-deep hover:shadow-[0_14px_28px_-12px_rgb(36_86_224/0.7)]"
            >
              Start free
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              href="#sample"
              className="inline-flex h-12 items-center rounded-full border border-line-strong bg-white px-8 text-base font-semibold text-ink transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-ink-soft hover:bg-parchment"
            >
              See a sample proposal
            </Link>
          </div>

          <p
            className="hero-enter mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-mute"
            style={HeroDelay(300)}
          >
            <span>Free to start</span>
            <span aria-hidden className="size-1 rounded-full bg-line-strong" />
            <span>No credit card required</span>
            <span aria-hidden className="size-1 rounded-full bg-line-strong" />
            <span>Sandbox checkout is simulated</span>
          </p>

          <HeroWorkflow />
        </div>
      </section>

      {/* ---------- Workflow ---------- */}
      <section
        id="how"
        className="mx-auto w-full max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6"
      >
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            How it works
          </p>
          <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold sm:text-4xl">
            From vague to paid in <em className="text-primary">four steps.</em>
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            One place to understand the request, shape the scope, and get to a
            payment your client can complete without another call.
          </p>
        </Reveal>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal
              as="li"
              key={step.n}
              delay={index * 80}
              className="h-full"
            >
              <Card className="group h-full transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-pop)]">
                <CardContent className="flex h-full flex-col pt-5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full border border-primary/20 bg-primary-ink font-mono text-[10px] font-semibold text-primary-deep">
                      {step.n}
                    </span>
                    <span
                      aria-hidden
                      className="h-px flex-1 bg-gradient-to-r from-primary/25 to-transparent"
                    />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- AI + payment explanation ---------- */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
          <Reveal>
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
              <MessageCircleQuestionMark className="size-3.5" aria-hidden />
              AI clarifications
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              The AI asks what <em className="text-ai">you&apos;d</em> forget to
              ask.
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Groq reads the raw request, identifies missing scope, timeline,
              and budget signals, and proposes up to five high-value questions —
              each with a one-line reason why it matters. You answer what you
              can; anything skipped is flagged as unresolved in the draft.
            </p>
            <ul className="mt-5 space-y-2.5">
              {AI_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-ink-soft"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ai-soft text-ai">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-mute">
              Estimates are advisory, never guarantees. Every price and every
              line of scope waits for your explicit approval.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-verified uppercase">
              <Wallet className="size-3.5" aria-hidden />
              Verified checkout
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Verified payment, <em className="text-verified">not vibes.</em>
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              The client accepts the frozen proposal version and pays through
              PayPal Sandbox. Your server creates the order from the database
              price, captures after buyer approval, and verifies the order id,
              capture id, amount, currency, and payee before anything is marked
              paid.
            </p>
            <ul className="mt-5 space-y-2.5">
              {PAYMENT_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-ink-soft"
                >
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-verified-soft text-verified">
                    <BadgeCheck className="size-3" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-mute">
              This deployment runs in PayPal Sandbox. No real money moves.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Sample proposal ---------- */}
      <SampleProposal />

      {/* ---------- FAQ + closing CTA ---------- */}
      <section
        id="faq"
        className="mx-auto w-full max-w-3xl scroll-mt-28 px-4 pb-20 sm:px-6"
      >
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            FAQ
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold">
            Honest answers.
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
            Clear boundaries, no invented customers, and no claims we cannot
            verify.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <FaqAccordion items={FAQS} />
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-12 overflow-hidden rounded-[var(--radius-card)] bg-ink p-8 text-center text-white shadow-[var(--shadow-pop)] sm:p-12">
            <div
              aria-hidden
              className="dot-grid absolute inset-0 opacity-15 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,black,transparent)]"
            />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
                Your next vague email is{" "}
                <em className="text-parchment">already waiting.</em>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/70">
                Turn it into a proposal that gets paid — clarify, draft, share,
                and verify, all in one place.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-ink transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-parchment"
                >
                  Start free
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  href="#how"
                  className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See how it works
                </Link>
              </div>
              <p className="mt-4 text-xs text-white/50">
                PayPal Sandbox in this deployment — simulated payments, no real
                money.
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
