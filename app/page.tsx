import type { Metadata } from "next";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { MarketingPage } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: "BriefPay AI — Turn vague client requests into proposals that get paid",
  description:
    "BriefPay AI helps freelancers clarify project requirements, prepare professional proposals, and collect payments through PayPal.",
};

// Reads the session cookie — render per request, not prerender.
export default async function Home() {
  await connection();
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    signedIn = false;
  }
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn={signedIn} />
      <main className="flex-1">
        <MarketingPage />
      </main>
      <SiteFooter />
    </div>
  );
}
