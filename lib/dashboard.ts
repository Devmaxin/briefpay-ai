import { createClient } from "./supabase/server.ts";
import {
  primaryCurrency,
  summariseProposals,
  verifiedTotals,
  type Counts,
  type CurrencyTotal,
  type PaymentState,
} from "./dashboard-stats.ts";
import type { DashboardProposal } from "./types.ts";

const RECENT_LIMIT = 20;

export interface DashboardData {
  proposals: DashboardProposal[];
  counts: Counts;
  verified: CurrencyTotal[];
  /** Currency used for the zero state of the paid KPI. */
  currency: string;
  proposalsError: string | null;
  countsError: string | null;
  paymentsError: string | null;
}

interface BriefJoin {
  client_name?: string | null;
  project_name?: string | null;
}

type RawProposal = Omit<DashboardProposal, "client_name" | "project_name"> & {
  project_briefs?: BriefJoin | BriefJoin[] | null;
};

/**
 * All dashboard reads happen server-side under RLS. No client id is ever
 * supplied: the session cookie determines whose rows Postgres returns.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [recentRes, totalRes, openRes, awaitingRes, paymentsRes] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        "id, title, summary, price, final_price, currency, status, estimated_timeline, updated_at, project_briefs(client_name, project_name)",
      )
      .order("updated_at", { ascending: false })
      .limit(RECENT_LIMIT),
    supabase.from("proposals").select("id", { count: "exact", head: true }),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase.from("payments").select("amount, currency, status").eq("status", "captured"),
  ]);

  if (recentRes.error) {
    console.error("[dashboard] proposals query failed:", recentRes.error.message);
  }
  if (paymentsRes.error) {
    console.error("[dashboard] payments query failed:", paymentsRes.error.message);
  }

  const proposals: DashboardProposal[] = ((recentRes.data ?? []) as unknown as RawProposal[]).map(
    (row) => {
      const joined = Array.isArray(row.project_briefs)
        ? row.project_briefs[0]
        : row.project_briefs;
      return {
        id: row.id,
        title: row.title,
        summary: row.summary,
        price: row.price,
        final_price: row.final_price,
        currency: row.currency,
        status: row.status,
        estimated_timeline: row.estimated_timeline,
        updated_at: row.updated_at,
        client_name: joined?.client_name ?? null,
        project_name: joined?.project_name ?? null,
      };
    },
  );

  const countError = totalRes.error ?? openRes.error ?? awaitingRes.error ?? null;
  if (countError) {
    console.error("[dashboard] count query failed:", countError.message);
  }

  const counts: Counts =
    countError || totalRes.count === null || openRes.count === null || awaitingRes.count === null
      ? summariseProposals([])
      : {
          total: totalRes.count,
          open: openRes.count,
          awaitingPayment: awaitingRes.count,
          paid: 0,
        };

  const payments = (paymentsRes.data ?? []) as unknown as PaymentState[];
  const verified = verifiedTotals(payments);

  return {
    proposals,
    counts,
    verified,
    currency: primaryCurrency(proposals),
    proposalsError: recentRes.error
      ? "We could not load your proposals. Refresh the page to try again."
      : null,
    countsError: countError
      ? "Some totals could not be loaded. Refresh the page to try again."
      : null,
    paymentsError: paymentsRes.error
      ? "Verified payment totals could not be loaded. Refresh the page to try again."
      : null,
  };
}
