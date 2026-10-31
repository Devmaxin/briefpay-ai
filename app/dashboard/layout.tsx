import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, getProfile } from "@/lib/auth";
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
          <code className="font-mono">.env.example</code>), apply the migrations
          in <code className="font-mono">supabase/migrations</code>, then restart
          the dev server.
        </p>
      </div>
    );
  }

  // Identity comes from the session cookie, never from the URL or client.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);

  return (
    <DashboardShell email={user.email ?? null} fullName={profile?.full_name ?? null}>
      {children}
    </DashboardShell>
  );
}
