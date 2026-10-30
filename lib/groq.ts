/**
 * Groq AI service — server-only.
 *
 * Analyzes vague client requests, asks clarifying questions, and drafts
 * structured proposals. The model output is ALWAYS validated against a
 * server-side zod schema and never trusted blindly.
 *
 * The model cannot authorize payment, change ownership, approve a
 * proposal, or set payment status — it only produces draft text that a
 * freelancer reviews and edits.
 */
import { serverEnv, isGroqConfigured } from "./env.ts";
import {
  ClarifyingQuestionsPayloadSchema,
  ProposalDraftPayloadSchema,
  type ClarifyingQuestion,
  type ProposalDraftPayload,
} from "./validation.ts";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 2000;

export class GroqError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "GroqError";
    this.status = status;
  }
}

interface ChatOptions {
  system: string;
  user: string;
  /** One bounded repair attempt is allowed for malformed JSON. */
  repairHint?: string;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new GroqError(
      "The AI returned an unreadable response. Please try again.",
    );
  }
}

async function chatJson({ system, user, repairHint }: ChatOptions): Promise<unknown> {
  if (!isGroqConfigured()) {
    throw new GroqError(
      "AI is not configured. Set GROQ_API_KEY on the server to enable proposal generation.",
      503,
    );
  }
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
  if (repairHint) {
    messages.push({
      role: "user" as const,
      content: `Your previous reply was invalid: ${repairHint} Reply with corrected JSON only.`,
    });
  }
  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.groqApiKey}`,
      },
      body: JSON.stringify({
        model: serverEnv.groqModel,
        messages,
        temperature: 0.4,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof GroqError) throw error;
    throw new GroqError(
      "The AI service timed out. Please try again in a moment.",
      504,
    );
  }
  if (res.status === 429) {
    throw new GroqError(
      "The AI service is busy (rate limited). Please wait a minute and try again.",
      429,
    );
  }
  if (!res.ok) {
    throw new GroqError("The AI service failed. Please try again.", 502);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new GroqError("The AI returned an empty response. Please try again.");
  }
  return extractJson(content);
}

/* ------------------------------------------------------------------ */

const QUESTIONS_SYSTEM = `You help freelancers turn vague client requests into clear proposals.
Given a client's raw request, identify the most important missing information.
Reply with JSON ONLY, matching this shape:
{"questions": [{"id": "q1", "question": "...", "why": "one short sentence on why this matters", "optional": false}]}
Rules: at most 5 questions, each under 30 words. Mark a question optional:true only if the proposal can proceed without it. Never invent client facts.ids must be q1..q5.`;

export async function generateClarifyingQuestions(
  rawRequest: string,
  projectType?: string,
): Promise<ClarifyingQuestion[]> {
  const user = `Client request:\n"""${rawRequest}"""${
    projectType ? `\nProject type: ${projectType}` : ""
  }`;
  const raw = await chatJson({ system: QUESTIONS_SYSTEM, user });
  const parsed = ClarifyingQuestionsPayloadSchema.safeParse(raw);
  if (parsed.success) return parsed.data.questions;
  // One bounded repair attempt.
  const retry = await chatJson({
    system: QUESTIONS_SYSTEM,
    user,
    repairHint: "schema violation",
  });
  const second = ClarifyingQuestionsPayloadSchema.safeParse(retry);
  if (second.success) return second.data.questions;
  throw new GroqError("The AI returned unusable questions. Please try again.");
}

/* ------------------------------------------------------------------ */

const PROPOSAL_SYSTEM = `You draft freelance project proposals from a client request plus the freelancer's answers.
Reply with JSON ONLY, matching this shape:
{
  "title": "short project title",
  "summary": "2-4 sentence scope summary",
  "assumptions": ["..."],
  "deliverables": [{"title": "...", "description": "..."}],
  "milestones": [{"title": "...", "description": "...", "duration": "..."}],
  "suggested_price": 1200,
  "currency": "USD",
  "estimated_timeline": "e.g. 3 weeks",
  "exclusions": ["..."],
  "revision_policy": "one or two sentences",
  "unresolved": ["..."]
}
Rules: suggested_price is a plain number (no symbols), advisory only. Never claim escrow, guarantees, or payment handling. Keep arrays small (deliverables 2-8). Put anything still unclear in "unresolved", never invent it.`;

export interface ProposalDraftInput {
  rawRequest: string;
  projectType?: string;
  currency: string;
  questions: { id: string; question: string }[];
  answers: { question_id: string; answer: string }[];
}

export async function generateProposalDraft(
  input: ProposalDraftInput,
): Promise<ProposalDraftPayload> {
  const qa = input.questions
    .map((q) => {
      const a = input.answers.find((x) => x.question_id === q.id)?.answer?.trim();
      return `Q: ${q.question}\nA: ${a || "(skipped)"}`;
    })
    .join("\n");
  const user = `Client request:\n"""${input.rawRequest}"""${
    input.projectType ? `\nProject type: ${input.projectType}` : ""
  }\nCurrency: ${input.currency}\nClarifications:\n${qa}\nSuggest a fair market price in ${input.currency}.`;
  const raw = await chatJson({ system: PROPOSAL_SYSTEM, user });
  const withCurrency =
    raw && typeof raw === "object" && !("currency" in (raw as object))
      ? { ...(raw as object), currency: input.currency }
      : raw;
  const parsed = ProposalDraftPayloadSchema.safeParse(withCurrency);
  if (parsed.success) return { ...parsed.data, currency: input.currency };
  const retry = await chatJson({
    system: PROPOSAL_SYSTEM,
    user,
    repairHint: "schema violation",
  });
  const second = ProposalDraftPayloadSchema.safeParse(
    retry && typeof retry === "object" && !("currency" in (retry as object))
      ? { ...(retry as object), currency: input.currency }
      : retry,
  );
  if (second.success) return { ...second.data, currency: input.currency };
  throw new GroqError(
    "The AI returned an unusable proposal draft. Please try again.",
  );
}
