import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lookupByToken } from "@/lib/share";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand";
import { CheckoutFlow } from "@/components/checkout-flow";

export const metadata: Metadata = { title: "Proposal" };

// Token-scoped lookup — must render per request, not prerender.
export const dynamic = "force-dynamic";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let found: Awaited<ReturnType<typeof lookupByToken>>;
  try {
    found = await lookupByToken(token);
  } catch {
    notFound();
  }
  if (found instanceof Response) notFound();
  const { proposal, version } = found;
  const snap = version.snapshot;
  const paid = proposal.status === "paid";
  const revoked = Boolean(proposal.revoked_at);

  // A revoked link cannot be viewed or accepted.
  if (revoked) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
        <header className="flex items-center justify-between">
          <Logo />
        </header>
        <main className="mt-6 flex flex-col gap-6">
          <div className="proposal-paper rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-10 text-center">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Link revoked
            </h1>
            <p className="mt-3 text-ink-soft">
              The freelancer has revoked this proposal link. It can no longer
              be viewed or accepted.
            </p>
          </div>
          <footer className="pb-8 text-center text-xs text-ink-mute">
            Sent with BriefPay AI · BriefPay holds no funds and provides no
            escrow.
          </footer>
        </main>
      </div>
    );
  }

  // Already paid: show the verified state, no acceptance needed.
  if (paid) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
        <header className="flex items-center justify-between">
          <Logo />
          <Badge variant="paid">Paid</Badge>
        </header>
        <main className="mt-6 flex flex-col gap-6">
          <div className="proposal-paper rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-10">
            <p className="font-mono text-[11px] tracking-[0.12em] text-ink-mute uppercase">
              Proposal · v{version.version_number} · Accepted &amp; paid{" "}
              {new Date(proposal.accepted_at ?? proposal.updated_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              {snap.title}
            </h1>
            <p className="mt-3 leading-relaxed text-ink-soft">{snap.summary}</p>
            <div className="mt-8 grid gap-4 rounded-2xl bg-parchment p-5 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                  Total due
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-verified">
                  {formatMoney(Number(version.price), version.currency)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                  Status
                </p>
                <p className="mt-1 text-sm text-verified">Accepted &amp; paid</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                  Timeline
                </p>
                <p className="mt-1 font-medium">{snap.estimated_timeline}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-verified/40 bg-verified-soft p-6 text-center">
            <p className="font-mono text-lg font-semibold text-verified">
              Accepted — thank you.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Your acceptance of this proposal has been recorded.
            </p>
          </div>
          <footer className="pb-8 text-center text-xs text-ink-mute">
            Sent with BriefPay AI · BriefPay holds no funds and provides no
            escrow.
          </footer>
        </main>
      </div>
    );
  }

  // Not yet accepted: show the acceptance form.
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between">
        <Logo />
        <Badge variant="sandbox">Sandbox demo</Badge>
      </header>
      <main className="mt-6 flex flex-col gap-6">
        <div className="proposal-paper rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-10">
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-mute uppercase">
            Proposal · v{version.version_number} · Approved{" "}
            {new Date(snap.approved_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            {snap.title}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-soft">{snap.summary}</p>

          <Section title="Scope of work">
            <p className="text-ink-soft">{snap.summary}</p>
          </Section>

          <Section title="Deliverables">
            <ul className="list-disc space-y-1.5 pl-5">
              {snap.deliverables.map((d, i) => (
                <li key={i}>
                  <strong>{d.title}</strong>
                  {d.description && <span className="text-ink-soft"> — {d.description}</span>}
                </li>
              ))}
            </ul>
          </Section>

          {snap.milestones.length > 0 && (
            <Section title="Milestones">
              <ol className="space-y-2">
                {snap.milestones.map((m, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-parchment-deep font-mono text-[11px]">
                      {i + 1}
                    </span>
                    <span>
                      <strong>{m.title}</strong>
                      {m.description && <span className="text-ink-soft"> — {m.description}</span>}
                      {m.duration && <span className="ml-2 font-mono text-xs text-ink-mute">{m.duration}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <Section title="Assumptions">
            <ul className="list-disc space-y-1 pl-5 text-ink-soft">
              {snap.assumptions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </Section>

          <Section title="Out of scope">
            <ul className="list-disc space-y-1 pl-5 text-ink-soft">
              {snap.exclusions.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Section>

          <div className="mt-8 grid gap-4 rounded-2xl bg-parchment p-5 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                Timeline
              </p>
              <p className="mt-1 font-medium">{snap.estimated_timeline}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                Revisions
              </p>
              <p className="mt-1 text-sm">{snap.revision_policy}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-mute">
                Total due
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {formatMoney(Number(version.price), version.currency)}
              </p>
            </div>
          </div>

          {snap.unresolved.length > 0 && (
            <p className="mt-4 text-xs text-ink-mute">
              Open items: {snap.unresolved.join(" · ")}
            </p>
          )}
        </div>

        <CheckoutFlow
          token={token}
          amount={Number(version.price)}
          currency={version.currency}
          accepted={Boolean(proposal.accepted_at)}
        />

        <footer className="pb-8 text-center text-xs text-ink-mute">
          Sent with BriefPay AI · BriefPay holds no funds and provides no
          escrow.
        </footer>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-deep">
        {title}
      </h2>
      <div className="mt-2 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}
