import type { ClarifyingQuestion } from "./validation.ts";

export type ProposalStatus = "draft" | "approved" | "paid";

export type PaymentStatus =
  | "created"
  | "captured"
  | "pending"
  | "failed"
  | "canceled"
  | "superseded";

export interface Deliverable {
  title: string;
  description: string;
}

export interface Milestone {
  title: string;
  description: string;
  duration: string;
}

/** Immutable snapshot of exactly what the client approved and paid for. */
export interface ProposalSnapshot {
  title: string;
  summary: string;
  assumptions: string[];
  deliverables: Deliverable[];
  milestones: Milestone[];
  price: number;
  currency: string;
  estimated_timeline: string;
  exclusions: string[];
  revision_policy: string;
  unresolved: string[];
  approved_at: string;
}

export interface ProposalRow {
  id: string;
  owner_id: string;
  brief_id: string | null;
  title: string;
  summary: string;
  assumptions: string[];
  deliverables: Deliverable[];
  milestones: Milestone[];
  price: number;
  currency: string;
  estimated_timeline: string;
  exclusions: string[];
  revision_policy: string;
  unresolved: string[];
  status: ProposalStatus;
  share_token: string | null;
  approved_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalVersionRow {
  id: string;
  proposal_id: string;
  version_number: number;
  snapshot: ProposalSnapshot;
  price: number;
  currency: string;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  proposal_id: string;
  version_id: string;
  paypal_order_id: string;
  paypal_capture_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payer_email: string | null;
  request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BriefRow {
  id: string;
  owner_id: string;
  raw_request: string;
  project_type: string | null;
  currency: string;
  questions: ClarifyingQuestion[] | null;
  answers: { question_id: string; answer: string }[] | null;
  status: "new" | "questions" | "drafted";
  created_at: string;
  updated_at: string;
}
