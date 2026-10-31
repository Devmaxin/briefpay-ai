import { cache } from "react";
import { createClient } from "./supabase/server.ts";
import type { ProfileRow } from "./types.ts";

/**
 * The authenticated user, resolved from the session cookies on the server.
 * `cache()` dedupes the Supabase call across layout and page in one render.
 * Never accept a user id from the browser — always start here.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Profile row for a user (created by the auth trigger at signup). */
export const getProfile = cache(async (userId: string): Promise<ProfileRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, display_name, full_name, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileRow | null) ?? null;
});
