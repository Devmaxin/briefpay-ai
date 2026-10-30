import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = { title: "Dashboard" };

// Authenticated shell — must render per request, not prerender.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-2xl font-semibold">
          Supabase is not configured
        </h1>
        <p className="mt-2 text-sm text-ink-mute">
          Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
          in <code className="font-mono">.env.local</code> (see{" "}
          <code className="font-mono">.env.example</code>) and restart the dev
          server.
        </p>
      </div>
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <DashboardShell email={user.email}>{children}</DashboardShell>;
}
