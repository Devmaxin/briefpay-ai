import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST only: signing out on a GET would let any image tag end a session.
 * Supabase clears its auth cookies through the SSR client; if the provider
 * call fails we still drop every `sb-*` cookie so the browser session ends.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[auth] sign out failed:", error.message);
      const cookieStore = await cookies();
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
      }
      return NextResponse.json(
        { ok: false, error: { message: "Signed out locally. Refresh if you still see your account." } },
        { status: 200 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth] sign out error:", error);
    return NextResponse.json(
      { ok: false, error: { message: "Could not sign out. Please try again." } },
      { status: 500 },
    );
  }
}
