import Link from "next/link";
import {
  ArrowRight, BadgeCheck, FileText, MessageCircleQuestionMark,
  MessagesSquare, Sparkles, Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

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
    title: "Review the proposal",
    body: "Get a structured draft with scope, milestones, exclusions, and an advisory price. You edit and approve every word.",
  },
  {
    n: "004",
    title: "Share & get paid",
    body: "Send a public link. Your client accepts the terms and pays via PayPal Sandbox — verified server-side.",
  },
];

const FAQS = [
  {
    q: "Is this real money?",
    a: "No. The hackathon MVP runs entirely in PayPal Sandbox with test buyer and seller accounts. No real funds move, and the interface labels every checkout as a Sandbox demo.",
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
    q: "What do I need to run it?",
    a: "A Supabase project (auth + Postgres), a Groq API key, and PayPal Sandbox REST credentials. Everything is documented in the README and configured through environment variables.",
  },
];

export function MarketingPage() {
  return (
    <div className="flex flex-col">
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
          <Badge variant="sandbox">PayPal AI Hackathon · Sandbox demo</Badge>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
            Turn vague client requests into{" "}
            <em className="text-primary">proposals that get paid.</em>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-soft">
            BriefPay AI helps freelancers clarify messy requirements, prepare
            professional proposals, and collect payments through PayPal — one
            smooth workflow from unclear scope to verified payment.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgb(36_86_224/0.6)] hover:bg-primary-deep"
            >
              Start free <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#sample"
              className="inline-flex h-12 items-center rounded-full border border-line-strong bg-white px-8 text-base font-semibold text-ink hover:border-ink-soft"
            >
              See a sample proposal
            </Link>
          </div>

          {/* Three-stage visual story */}
          <div className="mt-14 grid w-full gap-4 text-left md:grid-cols-3" aria-label="How BriefPay works, visually">
            <Card className="relative">
              <CardContent className="pt-5">
                <p className="font-mono text-[11px] tracking-[0.1em] text-ink-mute uppercase">001 · Vague request</p>
                <div className="mt-3 rounded-xl bg-parchment p-4 text-sm text-ink-soft italic">
                  “hey!! need a website for my bakery asap, something modern with
                  online cake orders?? lmk cost thx”
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-mute">
                  <MessagesSquare className="size-3.5" aria-hidden /> Illustrative demo data
                </p>
              </CardContent>
            </Card>
            <Card className="relative border-ai/30">
              <CardContent className="pt-5">
                <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
                  <Sparkles className="size-3.5" aria-hidden /> 002 · AI-assisted proposal
                </p>
                <div className="mt-3 rounded-xl bg-ai-soft/60 p-4 text-sm">
                  <p className="font-display font-semibold">Bakery Website &amp; Cake Ordering</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                    <li>Homepage + menu + ordering flow</li>
                    <li>2 design concepts, 3-week timeline</li>
                  </ul>
                  <p className="mt-2 font-mono text-sm font-semibold">{formatMoney(1800, "USD")}</p>
                </div>
                <p className="mt-3 text-xs text-ink-mute">AI-suggested — freelancer reviews everything</p>
              </CardContent>
            </Card>
            <Card className="relative border-verified/30">
              <CardContent className="pt-5">
                <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-verified uppercase">
                  <BadgeCheck className="size-3.5" aria-hidden /> 003 · Verified payment
                </p>
                <div className="mt-3 rounded-xl bg-verified-soft p-4 text-sm">
                  <p className="font-mono font-semibold text-verified">CAPTURED · {formatMoney(1800, "USD")}</p>
                  <p className="mt-1 text-ink-soft">Order verified server-side against the approved version.</p>
                </div>
                <p className="mt-3 text-xs text-ink-mute">Sandbox demo — no real money</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ---------- Workflow ---------- */}
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">How it works</p>
        <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold sm:text-4xl">
          From vague to paid in <em className="text-primary">four steps.</em>
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card className="h-full">
                <CardContent className="pt-5">
                  <p className="font-mono text-xs font-semibold text-primary-deep">{s.n}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- AI explanation ---------- */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
              <MessageCircleQuestionMark className="size-3.5" aria-hidden /> AI clarifications
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              The AI asks what <em className="text-ai">you&apos;d</em> forget to ask.
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              Groq reads the raw request, identifies missing scope, timeline,
              and budget signals, and proposes up to five high-value questions —
              each with a one-line reason why it matters. You answer what you
              can; anything skipped is flagged as unresolved in the draft.
            </p>
            <p className="mt-3 text-sm text-ink-mute">
              Estimates are advisory, never guarantees. Every price and every
              line of scope waits for your explicit approval.
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-primary-deep uppercase">
              <Wallet className="size-3.5" aria-hidden /> Sandbox checkout
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Verified payment, <em className="text-verified">not vibes.</em>
            </h2>
            <p className="mt-3 leading-relaxed text-ink-soft">
              The client accepts the frozen proposal version and pays through
              the PayPal Sandbox. Your server creates the order from the
              database price, captures after buyer approval, and verifies the
              order id, capture id, amount, currency, and payee before anything
              is marked paid. Retries are idempotent — no duplicate payments.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Sample proposal ---------- */}
      <section id="sample" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">Sample proposal</p>
        <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          What your client <em className="text-primary">sees.</em>
        </h2>
        <div className="proposal-paper mt-6 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-10">
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-mute uppercase">
            Proposal · v1 · Sample (demo data)
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
            Bakery Website &amp; Online Cake Ordering
          </h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            A modern, mobile-first website for Fern &amp; Field Bakery with a
            browsable menu and a simple cake pre-order flow, ready before the
            holiday rush.
          </p>
          <h4 className="mt-6 font-mono text-[11px] font-semibold tracking-[0.12em] text-primary-deep uppercase">Deliverables</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
            <li><strong>Homepage &amp; menu pages</strong> <span className="text-ink-soft">— new layout, photography-ready sections.</span></li>
            <li><strong>Cake pre-order form</strong> <span className="text-ink-soft">— date picker, pickup options, email confirmations.</span></li>
            <li><strong>Launch &amp; handover</strong> <span className="text-ink-soft">— deployed, tested, with a 30-min walkthrough.</span></li>
          </ul>
          <div className="mt-6 grid gap-4 rounded-2xl bg-parchment p-5 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">Timeline</p>
              <p className="mt-1 font-medium">3 weeks</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">Revisions</p>
              <p className="mt-1 text-sm">Two rounds included</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">Total due</p>
              <p className="mt-1 font-mono text-2xl font-semibold">{formatMoney(1800, "USD")}</p>
            </div>
          </div>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:opacity-90"
          >
            <FileText className="size-4" aria-hidden /> Create one like this
          </Link>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pb-14 sm:px-6">
        <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">FAQ</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">Honest answers.</h2>
        <dl className="mt-6 space-y-3">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-line bg-white p-5">
              <dt className="font-display text-lg font-semibold">{f.q}</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-ink-soft">{f.a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10 rounded-[var(--radius-card)] bg-ink p-8 text-center text-white sm:p-12">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">
            Your next vague email is <em className="text-parchment">already waiting.</em>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/70">
            Turn it into a proposal that gets paid — clarify, draft, share, and
            verify, all in one place.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-base font-semibold text-ink hover:bg-parchment"
          >
            Start free <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
