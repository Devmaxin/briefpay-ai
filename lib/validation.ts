import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

export const CurrencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code (e.g. USD).");

/** Accepts a number or numeric string from AI output, normalizes to a number. */
export const MoneySchema = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .regex(/^\d{1,7}(\.\d{1,2})?$/, "Price must be a plain number."),
  ])
  .transform((v) => (typeof v === "string" ? Number.parseFloat(v) : v))
  .pipe(
    z
      .number()
      .finite("Price must be a finite number.")
      .positive("Price must be greater than zero.")
      .max(1_000_000, "Price exceeds the MVP limit of 1,000,000."),
  )
  .transform((v) => Math.round(v * 100) / 100);

export const UuidSchema = z.string().uuid("Invalid identifier.");

export const ShareTokenSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]{32}$/,
    "Invalid share token. It must be a 32-character link token.",
  );

/* ------------------------------------------------------------------ */
/* Brief intake                                                        */
/* ------------------------------------------------------------------ */

export const ProjectTypeSchema = z
  .string()
  .trim()
  .max(80, "Project type must be 80 characters or fewer.")
  .optional();

export const AnalyzeBriefSchema = z.object({
  raw_request: z
    .string()
    .trim()
    .min(20, "Please paste at least a sentence or two about the request.")
    .max(4000, "Please keep the request under 4,000 characters."),
  project_type: ProjectTypeSchema,
  currency: CurrencySchema.default("USD"),
});

export type AnalyzeBriefInput = z.infer<typeof AnalyzeBriefSchema>;

export const ClarifyingAnswerSchema = z.object({
  question_id: z.string().trim().min(1).max(40),
  /** Empty string means the freelancer skipped this question. */
  answer: z.string().trim().max(1000).default(""),
});

export const GenerateProposalSchema = z.object({
  brief_id: UuidSchema,
  answers: z
    .array(ClarifyingAnswerSchema)
    .max(5, "At most five answers are accepted."),
});

export type GenerateProposalInput = z.infer<typeof GenerateProposalSchema>;

/* ------------------------------------------------------------------ */
/* AI output contracts (validated server-side, never trusted blindly)  */
/* ------------------------------------------------------------------ */

export const ClarifyingQuestionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  question: z.string().trim().min(8).max(300),
  why: z.string().trim().max(300).default(""),
  optional: z.boolean().default(false),
});

export const ClarifyingQuestionsPayloadSchema = z.object({
  questions: z
    .array(ClarifyingQuestionSchema)
    .min(1, "AI returned no questions.")
    .max(5, "AI returned more than five questions."),
});

export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;

const AiDeliverableSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
});

const AiMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
  duration: z.string().trim().max(120).default(""),
});

export const ProposalDraftPayloadSchema = z.object({
  title: z.string().trim().min(4).max(140),
  summary: z.string().trim().min(20).max(2000),
  assumptions: z
    .array(z.string().trim().min(1).max(300))
    .max(10)
    .default([]),
  deliverables: z.array(AiDeliverableSchema).min(1).max(12),
  milestones: z.array(AiMilestoneSchema).max(8).default([]),
  suggested_price: MoneySchema,
  currency: CurrencySchema.default("USD"),
  estimated_timeline: z.string().trim().min(1).max(200),
  exclusions: z
    .array(z.string().trim().min(1).max(300))
    .max(10)
    .default([]),
  revision_policy: z.string().trim().min(1).max(600),
  unresolved: z
    .array(z.string().trim().min(1).max(300))
    .max(10)
    .default([]),
});

export type ProposalDraftPayload = z.infer<typeof ProposalDraftPayloadSchema>;

/* ------------------------------------------------------------------ */
/* Proposal editing (freelancer-owned, validated the same as AI)       */
/* ------------------------------------------------------------------ */

export const DeliverableSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).default(""),
});

export const MilestoneSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).default(""),
  duration: z.string().trim().max(120).default(""),
});

export const UpdateProposalSchema = z
  .object({
    title: z.string().trim().min(4).max(140),
    summary: z.string().trim().min(20).max(2000),
    deliverables: z.array(DeliverableSchema).min(1).max(12),
    milestones: z.array(MilestoneSchema).max(8),
    exclusions: z.array(z.string().trim().min(1).max(300)).max(10),
    estimated_timeline: z.string().trim().min(1).max(200),
    price: z.number().positive().max(1_000_000),
    currency: CurrencySchema,
    revision_policy: z.string().trim().min(1).max(600),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No changes supplied.");

export type UpdateProposalInput = z.infer<typeof UpdateProposalSchema>;

/* ------------------------------------------------------------------ */
/* Checkout                                                            */
/* ------------------------------------------------------------------ */

export const CreateOrderSchema = z.object({
  token: ShareTokenSchema,
});

export const CaptureOrderSchema = z.object({
  token: ShareTokenSchema,
  order_id: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid PayPal order id."),
});

export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid input.";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}
