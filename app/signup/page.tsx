import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Create account" };

// Reads the session cookie — must render per request, not prerender.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  } catch {
    // Supabase not configured — still render the form with a helpful error.
  }
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn={false} />
      <main className="flex-1">
        <AuthForm mode="signup" />
      </main>
      <SiteFooter />
    </div>
  );
}
