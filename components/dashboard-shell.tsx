"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/identity";
import { Logo } from "@/components/brand";

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    hint: "Pipeline & payments",
    icon: LayoutDashboard,
    isActive: (pathname: string) =>
      pathname === "/dashboard" || pathname.startsWith("/dashboard/proposals"),
  },
  {
    href: "/dashboard/new",
    label: "New proposal",
    hint: "Start from a client brief",
    icon: PlusCircle,
    isActive: (pathname: string) => pathname.startsWith("/dashboard/new"),
  },
] as const;

export function DashboardShell({
  email,
  fullName,
  children,
}: {
  email?: string | null;
  fullName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const response = await fetch("/auth/signout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  function renderNav() {
    return (
      <nav aria-label="Workspace" className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:bg-parchment-deep hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  active ? "text-white" : "text-ink-mute group-hover:text-ink",
                )}
                aria-hidden
              />
              <span className="flex flex-col">
                <span className="font-semibold">{item.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    active ? "text-white/70" : "text-ink-mute",
                  )}
                >
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  function renderAccount() {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-ai-soft font-mono text-[11px] font-semibold text-ai"
          >
            {initials(fullName, email)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {fullName?.trim() || "Your account"}
            </span>
            <span className="block truncate text-xs text-ink-mute" title={email ?? undefined}>
              {email ?? "Signed in"}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        {signOutError && (
          <p role="alert" className="px-3 text-xs text-danger">
            {signOutError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col md:flex-row">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white/70 md:sticky md:top-0 md:flex md:h-[100svh]">
        <div className="border-b border-line px-5 py-5">
          <Logo />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 font-mono text-[10px] tracking-[0.12em] text-ink-mute uppercase">
            Workspace
          </p>
          {renderNav()}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <div className="rounded-xl border border-dashed border-line-strong bg-parchment-deep/60 p-3">
              <p className="font-mono text-[10px] tracking-[0.1em] text-caution uppercase">
                Sandbox demo
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Checkout uses PayPal Sandbox. No real money moves.
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-line px-3 py-4">{renderAccount()}</div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-line bg-parchment/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-workspace-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-xl border border-line bg-white text-ink"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
        <div
          id="mobile-workspace-menu"
          hidden={!open}
          className="border-t border-line bg-white px-3 py-3"
        >
          <p className="px-3 pb-2 font-mono text-[10px] tracking-[0.12em] text-ink-mute uppercase">
            Workspace
          </p>
          {renderNav()}
          <div className="mt-4 border-t border-line pt-4">{renderAccount()}</div>
        </div>
      </div>

      <main
        id="dashboard-main"
        className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-9 lg:px-10"
      >
        {children}
      </main>
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
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
      >
        <PlusCircle className="size-4" aria-hidden />
        Create your first proposal
      </Link>
    </div>
  );
}
