import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../env.ts";

export function createClient() {
  return createBrowserClient(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  );
}
