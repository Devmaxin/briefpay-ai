import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "../env.ts";

/** Session-aware server client (uses the logged-in user's cookies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    serverEnv.supabaseUrl,
    serverEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
          }
        },
      },
    },
  );
}
