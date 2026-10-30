import { NextResponse } from "next/server";
import { createAdminClient } from "./supabase/admin.ts";
import { ShareTokenSchema } from "./validation.ts";
import type { ProposalRow, ProposalVersionRow } from "./types.ts";

/**
 * Narrowly-scoped public lookup: share token ONLY. No owner email,
 * no unrelated records. Uses the service-role client because anonymous
 * buyers have no login session — authorization IS the valid token plus
 * approved/paid status.
 */
export async function lookupByToken(token: string): Promise<{
  proposal: ProposalRow;
  version: ProposalVersionRow;
} | NextResponse> {
  if (!ShareTokenSchema.safeParse(token).success) {
    return NextResponse.json(
      { ok: false, error: { message: "This proposal link is invalid." } },
      { status: 404 },
    );
  }
  const admin = createAdminClient();
  const { data: proposal } = await admin
    .from("proposals")
    .select("id, title, summary, assumptions, deliverables, milestones, price, currency, estimated_timeline, exclusions, revision_policy, unresolved, status, share_token, approved_version_id, updated_at")
    .eq("share_token", token)
    .in("status", ["approved", "paid"])
    .single();
  if (!proposal) {
    return NextResponse.json(
      { ok: false, error: { message: "This proposal link is invalid, expired, or was changed by the freelancer." } },
      { status: 404 },
    );
  }
  const p = proposal as ProposalRow;
  if (!p.approved_version_id) {
    return NextResponse.json(
      { ok: false, error: { message: "This proposal is not ready for checkout yet." } },
      { status: 409 },
    );
  }
  const { data: version } = await admin
    .from("proposal_versions")
    .select("*")
    .eq("id", p.approved_version_id)
    .single();
  if (!version) {
    return NextResponse.json(
      { ok: false, error: { message: "This proposal version is no longer available." } },
      { status: 410 },
    );
  }
  return { proposal: p, version: version as ProposalVersionRow };
}
