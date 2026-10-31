/**
 * Groq AI service tests.
 * Mocks `fetch` so no network or API key is required.
 * Run with: npm test   (node --test tests/*.test.ts)
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const realFetch = globalThis.fetch;
let installed = false;

function installFetchMock(handler: (req: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = handler as typeof globalThis.fetch;
  installed = true;
}

function uninstallFetchMock() {
  if (installed) {
    globalThis.fetch = realFetch;
    installed = false;
  }
}

function groqCompletion(content: string, status = 200): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }] }),
    { status, headers: { "content-type": "application/json" } },
  );
}

beforeEach(() => {
  uninstallFetchMock();
  // Do NOT set GROQ_API_KEY here — each test sets it explicitly.
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
});

afterEach(() => {
  uninstallFetchMock();
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
});

function configured() {
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_MODEL = "test-model";
}

describe("generateClarifyingQuestions", () => {
  it("returns up to 5 validated questions from the AI", async () => {
    configured();
    const questions = [
      { id: "q1", question: "What does success look like?", why: "Defines acceptance criteria.", optional: false },
      { id: "q2", question: "Who is the target audience?", why: "Shapes tone and scope.", optional: false },
      { id: "q3", question: "What is the deadline?", why: "Determines pricing.", optional: true },
    ];
    installFetchMock(async () => groqCompletion(JSON.stringify({ questions })));
    const mod = await import("../lib/groq.ts");
    const result = await mod.generateClarifyingQuestions("Build a bakery website with online ordering.", "Web design");
    assert.equal(result.length, 3);
    assert.equal(result[0].id, "q1");
    assert.equal(result[0].question, "What does success look like?");
  });

  it("rejects more than 5 questions after a failed repair attempt", async () => {
    configured();
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `q${i + 1}`,
      question: `Question number ${i + 1} about the project details?`,
      optional: false,
    }));
    installFetchMock(async () => groqCompletion(JSON.stringify({ questions: six })));
    const mod = await import("../lib/groq.ts");
    await assert.rejects(
      mod.generateClarifyingQuestions("Build a website.", "Web design"),
      /unusable/,
    );
  });

  it("repairs malformed JSON on a bounded retry", async () => {
    configured();
    let calls = 0;
    installFetchMock(async () => {
      calls++;
      if (calls === 1) {
        // Valid Groq envelope, but content is malformed JSON.
        return groqCompletion("not json at all");
      }
      // Second call: valid questions inside content.
      return groqCompletion(JSON.stringify({
        questions: [
          { id: "q1", question: "What is the budget?", why: "Sets pricing expectations.", optional: false },
        ],
      }));
    });
    const mod = await import("../lib/groq.ts");
    const result = await mod.generateClarifyingQuestions("Build a website.");
    assert.equal(calls, 2);
    assert.equal(result.length, 1);
  });

  it("throws on an empty AI response", async () => {
    configured();
    installFetchMock(async () => groqCompletion("", 200));
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateClarifyingQuestions("Build a website."), /empty/);
  });

  it("throws on a rate limit (429)", async () => {
    configured();
    installFetchMock(async () => groqCompletion(JSON.stringify({ error: "rate limited" }), 429));
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateClarifyingQuestions("Build a website."), /busy|rate limited/);
  });

  it("throws on a provider error (502)", async () => {
    configured();
    installFetchMock(async () => groqCompletion(JSON.stringify({ error: "provider down" }), 502));
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateClarifyingQuestions("Build a website."), /failed/);
  });

  it("throws on a fetch failure (504)", async () => {
    configured();
    installFetchMock(async () => {
      throw new Error("connection refused");
    });
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateClarifyingQuestions("Build a website."), /timed out/);
  });

  it("throws a 503 when Groq is not configured", async () => {
    // GROQ_API_KEY is deliberately not set (deleted in beforeEach).
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateClarifyingQuestions("Build a website."), /not configured/);
  });
});

describe("generateProposalDraft", () => {
  const validInput = {
    rawRequest: "Build a bakery website with online cake ordering.",
    projectType: "Web design",
    currency: "USD",
    questions: [{ id: "q1", question: "What does success look like?" }],
    answers: [{ question_id: "q1", answer: "A modern site that converts visitors." }],
  };

  it("returns a validated proposal draft from the AI", async () => {
    configured();
    installFetchMock(async () =>
      groqCompletion(JSON.stringify({
        title: "Bakery Website",
        summary: "A modern website for a bakery with online cake ordering.",
        assumptions: ["Client provides logo and copy."],
        deliverables: [{ title: "Homepage", description: "Hero and menu sections" }],
        milestones: [{ title: "Design", description: "Mockups", duration: "Week 1" }],
        suggested_price: 1800,
        currency: "USD",
        estimated_timeline: "3 weeks",
        exclusions: ["Copywriting"],
        revision_policy: "Two rounds included.",
        unresolved: ["Hosting access"],
      })),
    );
    const mod = await import("../lib/groq.ts");
    const result = await mod.generateProposalDraft(validInput);
    assert.equal(result.title, "Bakery Website");
    assert.equal(result.suggested_price, 1800);
    assert.equal(result.currency, "USD");
    assert.equal(result.deliverables.length, 1);
  });

  it("forces the currency from the input even if AI omits it", async () => {
    configured();
    installFetchMock(async () =>
      groqCompletion(JSON.stringify({
        title: "Bakery Website",
        summary: "A modern website for a bakery with online ordering.",
        deliverables: [{ title: "Homepage", description: "Hero section" }],
        suggested_price: 1800,
        estimated_timeline: "3 weeks",
        revision_policy: "Two rounds included.",
      })),
    );
    const mod = await import("../lib/groq.ts");
    const result = await mod.generateProposalDraft({ ...validInput, currency: "EUR" });
    assert.equal(result.currency, "EUR");
  });

  it("rejects invalid AI output after a bounded repair attempt", async () => {
    configured();
    let calls = 0;
    installFetchMock(async () => {
      calls++;
      // Return valid JSON but missing required schema fields.
      return groqCompletion(JSON.stringify({ title: "Too short" }));
    });
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateProposalDraft(validInput), /unusable/);
    assert.equal(calls, 2);
  });

  it("throws a 503 when Groq is not configured", async () => {
    // GROQ_API_KEY is deliberately not set.
    const mod = await import("../lib/groq.ts");
    await assert.rejects(mod.generateProposalDraft(validInput), /not configured/);
  });
});

describe("isGroqConfigured", () => {
  it("returns true when GROQ_API_KEY is set", async () => {
    process.env.GROQ_API_KEY = "key";
    const mod = await import("../lib/env.ts");
    assert.equal(mod.isGroqConfigured(), true);
    delete process.env.GROQ_API_KEY;
  });

  it("returns false when GROQ_API_KEY is missing", async () => {
    // Already deleted in beforeEach.
    const mod = await import("../lib/env.ts");
    assert.equal(mod.isGroqConfigured(), false);
  });
});
