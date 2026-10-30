"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Home, LogOut, Menu, PlusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: Home, exact: true },
  { href: "/dashboard/new", label: "New proposal", icon: PlusCircle, exact: false },
];

export function DashboardShell({
  email,
  children,
}: {
  email?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-ink text-white"
                : "text-ink-soft hover:bg-parchment-deep hover:text-ink",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-2 border-t border-line pt-2">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="size-4" aria-hidden />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line px-5 py-6 md:flex">
        <Logo />
        {nav}
        <div className="mt-auto rounded-xl border border-dashed border-line-strong bg-parchment-deep/60 p-3">
          <p className="font-mono text-[10px] tracking-[0.1em] text-caution uppercase">
            Sandbox demo
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Checkout uses PayPal Sandbox. No real money moves.
          </p>
        </div>
        {email && (
          <p className="truncate text-xs text-ink-mute" title={email}>
            {email}
          </p>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-line bg-parchment/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-xl border border-line bg-white"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && <div className="border-t border-line bg-white px-4 py-3">{nav}</div>}
      </div>

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {children}
      </div>
    </div>
  );
}

export function EmptyProposals() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-ai-soft text-ai">
        <FileText className="size-6" />
      </span>
      <h3 className="font-display text-xl font-semibold">No proposals yet</h3>
      <p className="max-w-sm text-sm text-ink-mute">
        Paste a vague client request and BriefPay AI will help you clarify it,
        draft a professional proposal, and get it paid.
      </p>
      <Link
        href="/dashboard/new"
        className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-deep"
      >
        <PlusCircle className="size-4" aria-hidden />
        Create your first proposal
      </Link>
    </div>
  );
}
