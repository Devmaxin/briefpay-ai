import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, requireUser, toApiError, zodFail } from "@/lib/api";
import { UpdateProposalSchema } from "@/lib/validation";
import { generateShareToken } from "@/lib/utils";
import type { ProposalRow, ProposalSnapshot } from "@/lib/types";

function snapshotOf(p: ProposalRow): ProposalSnapshot {
  return {
    title: p.title,
    summary: p.summary,
    assumptions: p.assumptions,
    deliverables: p.deliverables,
    milestones: p.milestones,
    price: Number(p.price),
    currency: p.currency,
    estimated_timeline: p.estimated_timeline,
    exclusions: p.exclusions,
    revision_policy: p.revision_policy,
    unresolved: p.unresolved,
    approved_at: new Date().toISOString(),
  };
}

async function log(supabase: Awaited<ReturnType<typeof createClient>>, ownerId: string, proposalId: string, event: string) {
  await supabase.from("activity_logs").insert({ owner_id: ownerId, proposal_id: proposalId, event });
}

/* GET /api/proposals/[id] — owner reads their proposal + versions. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user, supabase } = auth;
    const { id } = await params;
    const { data: proposal } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!proposal) return fail("Proposal not found.", 404);
    const { data: versions } = await supabase
      .from("proposal_versions")
      .select("id, version_number, price, currency, created_at")
      .eq("proposal_id", id)
      .order("version_number", { ascending: false });
    return ok({ proposal, versions: versions ?? [] });
  } catch (error) {
    return toApiError(error);
  }
}

/* PATCH /api/proposals/[id] — owner edits a draft (or a superseded approved one). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user, supabase } = auth;
    const { id } = await params;
    const body: unknown = await request.json().catch(() => null);
    const parsed = UpdateProposalSchema.safeParse(body);
    if (!parsed.success) return zodFail(parsed.error);

    const { data: current } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!current) return fail("Proposal not found.", 404);
    const row = current as ProposalRow;
    if (row.status === "paid") {
      return fail("Paid proposals are locked. Create a new proposal for follow-up work.", 409);
    }

    const patch = parsed.data as Partial<ProposalRow>;
    // Editing after approval invalidates the previous approval: any unpaid
    // checkout session for the old version is superseded.
    const invalidateApproval = row.status === "approved";
    const { data: updated, error } = await supabase
      .from("proposals")
      .update({
        ...patch,
        ...(invalidateApproval
          ? { status: "draft" as const, share_token: generateShareToken(), approved_version_id: null }
          : {}),
      })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("*")
      .single();
    if (error || !updated) return fail("Could not save changes.", 500);

    if (invalidateApproval) {
      const admin = createAdminClient();
      await admin
        .from("payments")
        .update({ status: "superseded" })
        .eq("proposal_id", id)
        .eq("status", "created");
      await log(supabase, user.id, id, "approval_invalidated_by_edit");
    }
    await log(supabase, user.id, id, "proposal_edited");
    return ok({ proposal: updated, approval_invalidated: invalidateApproval });
  } catch (error) {
    return toApiError(error);
  }
}

/* POST /api/proposals/[id]/approve — freeze an immutable version + share link. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user, supabase } = auth;
    const { id } = await params;
    void request;
    const { data: current } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!current) return fail("Proposal not found.", 404);
    const row = current as ProposalRow;
    if (row.status === "paid") return fail("Paid proposals cannot be re-approved.", 409);
    if (!row.title || !row.summary || row.deliverables.length === 0 || Number(row.price) <= 0) {
      return fail("Complete the title, summary, deliverables, and a price above zero first.", 422);
    }

    const { data: latest } = await supabase
      .from("proposal_versions")
      .select("version_number")
      .eq("proposal_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();
    const versionNumber = ((latest as { version_number: number } | null)?.version_number ?? 0) + 1;

    const { data: version, error: vError } = await supabase
      .from("proposal_versions")
      .insert({
        proposal_id: id,
        version_number: versionNumber,
        snapshot: snapshotOf(row),
        price: Number(row.price),
        currency: row.currency,
      })
      .select("id")
      .single();
    if (vError || !version) return fail("Could not create the approved version.", 500);

    const token = row.share_token ?? generateShareToken();
    const { data: approved, error: aError } = await supabase
      .from("proposals")
      .update({
        status: "approved" as const,
        share_token: token,
        approved_version_id: (version as { id: string }).id,
      })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("*")
      .single();
    if (aError || !approved) return fail("Could not approve the proposal.", 500);

    await log(supabase, user.id, id, `proposal_approved_v${versionNumber}`);
    return ok({ proposal: approved, share_url: `/p/${token}` });
  } catch (error) {
    return toApiError(error);
  }
}
