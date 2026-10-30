import { AnalyzeBriefSchema, GenerateProposalSchema } from "@/lib/validation";
import { fail, ok, requireUser, toApiError, zodFail } from "@/lib/api";
import { generateClarifyingQuestions, generateProposalDraft, GroqError } from "@/lib/groq";
import { isGroqConfigured } from "@/lib/env";

const DEMO_QUESTIONS = [
  { id: "q1", question: "What does success look like for this project?", why: "Defines the acceptance criteria.", optional: false },
  { id: "q2", question: "Who is the target audience?", why: "Shapes tone, scope, and deliverables.", optional: false },
  { id: "q3", question: "What is the deadline or timeline?", why: "Determines pricing and milestones.", optional: false },
  { id: "q4", question: "What is explicitly out of scope?", why: "Prevents scope creep.", optional: true },
  { id: "q5", question: "Any references or examples you like?", why: "Aligns creative direction.", optional: true },
];

export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user, supabase } = auth;
    const body: unknown = await request.json().catch(() => null);
    const parsed = AnalyzeBriefSchema.safeParse(body);
    if (!parsed.success) return zodFail(parsed.error);

    const { data: brief, error } = await supabase
      .from("project_briefs")
      .insert({
        owner_id: user.id,
        raw_request: parsed.data.raw_request,
        project_type: parsed.data.project_type ?? null,
        currency: parsed.data.currency,
        status: "new",
      })
      .select("id")
      .single();
    if (error || !brief) return fail("Could not save your brief. Please try again.", 500);

    let questions = DEMO_QUESTIONS;
    let demoMode = false;
    if (isGroqConfigured()) {
      try {
        questions = await generateClarifyingQuestions(
          parsed.data.raw_request,
          parsed.data.project_type,
        );
      } catch (e) {
        if (e instanceof GroqError && e.status === 503) {
          demoMode = true;
        } else {
          throw e;
        }
      }
    } else {
      demoMode = true;
    }

    await supabase
      .from("project_briefs")
      .update({ questions, status: "questions" })
      .eq("id", brief.id);

    return ok({ brief_id: brief.id, questions, demo_mode: demoMode });
  } catch (error) {
    if (error instanceof GroqError) {
      return fail(error.message, error.status);
    }
    return toApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user, supabase } = auth;
    const body: unknown = await request.json().catch(() => null);
    const parsed = GenerateProposalSchema.safeParse(body);
    if (!parsed.success) return zodFail(parsed.error);

    const { data: brief } = await supabase
      .from("project_briefs")
      .select("*")
      .eq("id", parsed.data.brief_id)
      .eq("owner_id", user.id)
      .single();
    if (!brief) return fail("Brief not found.", 404);

    const draft = isGroqConfigured()
      ? await generateProposalDraft({
          rawRequest: brief.raw_request as string,
          projectType: (brief.project_type as string | null) ?? undefined,
          currency: (brief.currency as string) ?? "USD",
          questions: ((brief.questions as { id: string; question: string }[] | null) ?? []).map(
            (q) => ({ id: q.id, question: q.question }),
          ),
          answers: parsed.data.answers,
        })
      : demoDraft((brief.currency as string) ?? "USD");

    const { data: proposal, error } = await supabase
      .from("proposals")
      .insert({
        owner_id: user.id,
        brief_id: brief.id,
        title: draft.title,
        summary: draft.summary,
        assumptions: draft.assumptions,
        deliverables: draft.deliverables,
        milestones: draft.milestones,
        price: draft.suggested_price,
        currency: draft.currency,
        estimated_timeline: draft.estimated_timeline,
        exclusions: draft.exclusions,
        revision_policy: draft.revision_policy,
        unresolved: draft.unresolved,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !proposal) return fail("Could not create the proposal. Please try again.", 500);

    await supabase
      .from("project_briefs")
      .update({ answers: parsed.data.answers, status: "drafted" })
      .eq("id", brief.id);

    return ok({ proposal_id: (proposal as { id: string }).id, demo_mode: !isGroqConfigured() });
  } catch (error) {
    if (error instanceof GroqError) return fail(error.message, error.status);
    return toApiError(error);
  }
}

function demoDraft(currency: string) {
  return {
    title: "Website Refresh — Draft Proposal",
    summary:
      "Refresh the client's online presence with a modern, fast, mobile-first website covering the key pages and a contact flow.",
    assumptions: ["Client provides logo, copy, and imagery within 5 business days."],
    deliverables: [
      { title: "Homepage redesign", description: "New hero, services, and social proof sections." },
      { title: "Up to 4 inner pages", description: "Consistent layout system and typography." },
      { title: "Contact form", description: "Spam-protected form wired to the client's email." },
    ],
    milestones: [
      { title: "Design concepts", description: "Two directions for review.", duration: "Week 1" },
      { title: "Build & launch", description: "Build, test, and deploy.", duration: "Weeks 2–3" },
    ],
    suggested_price: 1800,
    currency,
    estimated_timeline: "3 weeks",
    exclusions: ["Copywriting beyond light edits", "Ongoing maintenance"],
    revision_policy: "Two rounds of revisions included; extra rounds billed at the hourly rate.",
    unresolved: ["Confirm hosting and domain access."],
  };
}
