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
    title: "Start with the brief",
    body: "Paste your client's email, message, or project request. BriefPay AI works with the information you already have, even when it's messy or incomplete.",
  },
  {
    n: "002",
    title: "Get the right questions",
    body: "Identify missing details before they become project problems. Get relevant questions that help clarify expectations, scope, timeline, and budget.",
  },
  {
    n: "003",
    title: "Build your proposal",
    body: "Turn the answers into a structured proposal. Review the deliverables, milestones, exclusions, revisions, timeline, and suggested price before approving it.",
  },
  {
    n: "004",
    title: "Share and get paid",
    body: "Send your client a proposal link. They can review the agreed scope, accept the terms, and proceed to payment through the available checkout flow.",
  },
];

const AI_POINTS = [
  "Identify missing project requirements before you start.",
  "Get relevant clarification questions with explanations.",
  "Surface gaps in scope, timeline, and budget.",
  "Keep unanswered questions visible when preparing your proposal.",
];

const PAYMENT_POINTS = [
  "Payment amounts and currencies are based on the approved proposal.",
  "Checkout is tied to the agreed proposal version.",
  "Payment captures are verified by the server.",
  "Retry handling helps prevent duplicate payment records.",
];

const FAQS = [
  {
    q: "Is BriefPay AI free to use?",
    a: "You can get started without an upfront subscription payment. Any paid features or usage limits will be presented clearly within the product.",
  },
  {
    q: "Does BriefPay hold funds or offer escrow?",
    a: "No. BriefPay does not hold client funds or provide escrow. Payments are processed through PayPal, and BriefPay records the payment status after server-side verification.",
  },
  {
    q: "How accurate is the AI-generated pricing?",
    a: "AI-generated prices are suggestions based on the project information available. They are not guaranteed market rates. You should review and adjust the amount before approving and sharing a proposal.",
  },
  {
    q: "What happens when I edit a proposal after sharing it?",
    a: "Changes to an approved proposal create a new version. The previous approval does not automatically apply to the new terms. Your client must review and approve the updated version before proceeding with payment.",
  },
  {
    q: "Can my client review a proposal without creating a BriefPay account?",
    a: "Clients can access a shared proposal through its unique link without signing in to your freelancer dashboard. Payment options and any additional PayPal requirements depend on PayPal's checkout eligibility.",
  },
  {
    q: "What do I need to get started?",
    a: "Create a BriefPay account and bring a client request, even if it's just a short email or message. BriefPay AI will help you identify missing information and turn it into a structured proposal.",
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
              From first conversation to final payment
            </Badge>
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
            Your clients don&apos;t always know how to explain what they need.
            BriefPay AI helps you ask the right questions, define the scope,
            create professional proposals, and collect payments through one
            streamlined workflow.
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
              Explore a sample proposal
            </Link>
          </div>

          <p
            className="hero-enter mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-mute"
            style={HeroDelay(300)}
          >
            <span>Free to get started</span>
            <span aria-hidden className="size-1 rounded-full bg-line-strong" />
            <span>No complicated proposal templates</span>
            <span aria-hidden className="size-1 rounded-full bg-line-strong" />
            <span>PayPal checkout currently runs in Sandbox</span>
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
            A simpler way to handle client projects
          </p>
          <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold sm:text-4xl">
            From the first request to a{" "}
            <em className="text-primary">paid project</em> in four steps.
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">
            Stop piecing together client requirements across emails, messages,
            documents, and payment links. BriefPay brings the proposal process
            together so you can focus on getting the work done.
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
              Better questions. Clearer projects.
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Know what to ask{" "}
              <em className="text-ai">before you agree</em> to the work.
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              A vague request can hide important details. BriefPay AI examines
              the client&apos;s requirements and helps you identify what still
              needs to be clarified before you prepare a proposal.
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
              Your AI-generated suggestions are starting points, not final
              decisions. You remain in control of the scope, pricing, and terms
              you share with your client.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-verified uppercase">
              <Wallet className="size-3.5" aria-hidden />
              From approval to payment
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Every payment should{" "}
              <em className="text-verified">match the agreement.</em>
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              A proposal is more than a price. It&apos;s an agreement about what
              will be delivered. BriefPay connects client approval to the
              specific proposal version being paid for, helping prevent payment
              confusion when project details change.
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
              BriefPay does not hold client funds or provide escrow. Payment
              processing is handled through PayPal.
            </p>
            <p className="mt-3 rounded-xl border border-caution/30 bg-caution-soft px-3.5 py-2.5 text-xs leading-relaxed text-caution">
              PayPal Sandbox is currently enabled. Transactions are simulated
              and no real money moves.
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
            Frequently asked questions
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold">
            Everything you need to know{" "}
            <em className="text-primary">before getting started.</em>
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
            Understand how BriefPay works, what it handles, and where you remain
            in control.
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
                Make your next client conversation{" "}
                <em className="text-parchment">count.</em>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-white/70">
                Turn unclear requests into clear agreements. Ask better
                questions, prepare professional proposals, and move projects
                towards payment without the usual back-and-forth.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-ink transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-parchment"
                >
                  Create your first proposal
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                <Link
                  href="#how"
                  className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Explore how it works
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
