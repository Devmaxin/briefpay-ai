import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";
import { MobileMenu } from "@/components/mobile-menu";

const links = [
  { href: "/#how", label: "How it works" },
  { href: "/#sample", label: "Sample proposal" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-parchment/90 backdrop-blur supports-[backdrop-filter]:bg-parchment/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link href="/dashboard">
              <Button size="sm">Open dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Start free</Button>
              </Link>
            </>
          )}
        </div>
        <MobileMenu signedIn={signedIn} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-mute">
            From vague to paid — clarify requirements, prepare professional
            proposals, and collect payments through PayPal.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <span className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">
            Product
          </span>
          <Link href="/#how" className="text-ink-soft hover:text-ink">
            How it works
          </Link>
          <Link href="/#sample" className="text-ink-soft hover:text-ink">
            Sample proposal
          </Link>
          <Link href="/dashboard/new" className="text-ink-soft hover:text-ink">
            New proposal
          </Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-mono text-[11px] tracking-[0.08em] text-ink-mute uppercase">
            Payment environment
          </span>
          <p className="max-w-xs text-ink-mute">
            Checkout runs in PayPal Sandbox — payments are simulated and no real
            money moves. BriefPay does not hold funds or provide escrow.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-ink-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 BriefPay AI. All rights reserved.</span>
          <span className="font-mono">PAYPAL SANDBOX — SIMULATED PAYMENTS</span>
        </div>
      </div>
    </footer>
  );
}
