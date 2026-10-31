import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin.ts";
import { fail, ok, toApiError } from "@/lib/api";
import { z } from "zod";
import { ShareTokenSchema } from "@/lib/validation.ts";
import type { ProposalAcceptance } from "@/lib/types.ts";

const AcceptProposalSchema = z.object({
  token: ShareTokenSchema,
  client_name: z.string().trim().max(140).optional(),
  client_email: z.string().trim().email().max(254).optional(),
  terms_agreed: z.boolean().default(true),
});

/**
 * POST /api/proposals/accept — public client acceptance of a proposal.
 *
 * No authentication required: authorization is the valid share token plus
 * an approved, non-revoked, non-paid proposal with a current version.
 *
 * Records the acceptance in proposal_acceptances and freezes
 * proposals.accepted_at. Idempotent: re-accepting an already-accepted
 * proposal returns the existing acceptance.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = AcceptProposalSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid acceptance request.", 422);
    }

    const { token, client_name, client_email, terms_agreed } = parsed.data;
    if (!terms_agreed) {
      return fail("You must agree to the terms before accepting.", 400);
    }

    const admin = createAdminClient();

    // Validate the token and load the proposal + approved version.
    // Uses the service-role key because the client has no login session.
    const { data: proposal, error: pError } = await admin
      .from("proposals")
      .select(
        "id, owner_id, title, status, share_token, approved_version_id, revoked_at, accepted_at, final_price",
      )
      .eq("share_token", token)
      .in("status", ["approved", "paid"])
      .single();

    if (pError || !proposal) {
      return fail(
        "This proposal link is invalid, expired, or was changed by the freelancer.",
        404,
      );
    }

    const p = proposal as {
      id: string;
      owner_id: string;
      status: string;
      share_token: string | null;
      approved_version_id: string | null;
      revoked_at: string | null;
      accepted_at: string | null;
    };

    // Link revocation: refuse once the freelancer has revoked it.
    if (p.revoked_at) {
      return fail(
        "This proposal link has been revoked by the freelancer.",
        410,
      );
    }

    // Already paid: acceptance is meaningless.
    if (p.status === "paid") {
      return fail("This proposal has already been accepted and paid.", 409);
    }

    // Already accepted: idempotent — return the existing acceptance.
    if (p.accepted_at) {
      const { data: existing } = await admin
        .from("proposal_acceptances")
        .select("*")
        .eq("proposal_id", p.id)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .single();
      return ok({
        acceptance: existing,
        already_accepted: true,
        proposal: p,
      });
    }

    // Load the approved version to record which exact version was accepted.
    if (!p.approved_version_id) {
      return fail("This proposal has no approved version to accept.", 409);
    }

    const { data: version, error: vError } = await admin
      .from("proposal_versions")
      .select("id, version_number, price, currency, snapshot")
      .eq("id", p.approved_version_id)
      .single();

    if (vError || !version) {
      return fail("The approved proposal version is no longer available.", 410);
    }

    // Record the acceptance.
    const { data: acceptance, error: aError } = await admin
      .from("proposal_acceptances")
      .insert({
        proposal_id: p.id,
        version_id: p.approved_version_id,
        client_name: client_name ?? null,
        client_email: client_email ?? null,
        terms_agreed: true,
      })
      .select("id, proposal_id, version_id, accepted_at, client_name, client_email, terms_agreed, created_at")
      .single();

    if (aError || !acceptance) {
      return fail("Could not record your acceptance. Please try again.", 500);
    }

    // Freeze the acceptance timestamp on the proposal.
    const { error: uError } = await admin
      .from("proposals")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", p.id);

    if (uError) {
      // Acceptance was recorded; the timestamp freeze is best-effort.
      console.error("[accept] failed to freeze accepted_at:", uError.message);
    }

    return ok({
      acceptance: acceptance as ProposalAcceptance,
      already_accepted: false,
      proposal: { id: p.id, status: p.status, accepted_at: new Date().toISOString() },
      version: {
        id: version.id,
        version_number: version.version_number,
      },
    });
  } catch (error) {
    return toApiError(error);
  }
}
