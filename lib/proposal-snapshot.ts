import type { ProposalRow, ProposalSnapshot } from "./types.ts";

/**
 * Convert a proposal row into an immutable snapshot for versioning.
 * The snapshot captures exactly what was proposed at a point in time,
 * so approved versions can never be silently rewritten.
 */
export function snapshotOf(p: ProposalRow): ProposalSnapshot {
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
