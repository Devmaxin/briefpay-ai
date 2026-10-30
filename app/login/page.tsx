import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Sign in" };

// Reads the session cookie — render per request, not prerender.

export default async function LoginPage() {
  await connection(); // session cookie — render per request, not prerender.
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
        <AuthForm mode="login" />
      </main>
      <SiteFooter />
    </div>
  );
}
