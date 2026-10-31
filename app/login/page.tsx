import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ConfigNotice } from "@/components/config-notice";

export const metadata: Metadata = { title: "Sign in" };

// Reads the session cookie — must render per request, not prerender.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  if (isSupabaseConfigured()) {
    let user = null;
    try {
      user = await getCurrentUser();
    } catch {
      user = null;
    }
    // Outside the try/catch: redirect() throws, and must not be swallowed.
    if (user) redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn={false} />
      <main className="flex-1">
        {!isSupabaseConfigured() && <ConfigNotice />}
        <AuthForm mode="login" nextPath={next} />
      </main>
      <SiteFooter />
    </div>
  );
}
