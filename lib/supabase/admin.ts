import { createClient as createServiceClient } from "@supabase/supabase-js";
import { serverEnv } from "../env.ts";

/**
 * Privileged server-only client (service role, bypasses RLS).
 * Use ONLY where anonymous access is legitimate AND authorization is
 * validated independently in code:
 *  - public share-link reads (authorization = valid share token)
 *  - PayPal payment writes (authorization = verified PayPal capture)
 * NEVER import from client components. NEVER expose the key.
 */
export function createAdminClient() {
  return createServiceClient(
    serverEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
