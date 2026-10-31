import { NextResponse } from "next/server";
import { fail, ok, requireUser, toApiError } from "@/lib/api";

/**
 * POST /api/proposals/[id]/revoke-share — revoke a proposal's share link.
 *
 * Requires the proposal owner's session. Sets revoked_at so the public
 * /p/[token] page refuses to render the proposal. The token itself is
 * preserved (not deleted) so the revocation is auditable.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user, supabase } = auth;
    const { id } = await params;

    const { data: current } = await supabase
      .from("proposals")
      .select("id, status, share_token, revoked_at")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();

    if (!current) {
      return fail("Proposal not found.", 404);
    }

    const row = current as {
      id: string;
      status: string;
      share_token: string | null;
      revoked_at: string | null;
    };

    if (!row.share_token) {
      return fail("This proposal has no active share link.", 409);
    }

    if (row.revoked_at) {
      return fail("This share link has already been revoked.", 409);
    }

    const { error } = await supabase
      .from("proposals")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) {
      return fail("Could not revoke the share link. Please try again.", 500);
    }

    return ok({ revoked: true });
  } catch (error) {
    return toApiError(error);
  }
}
