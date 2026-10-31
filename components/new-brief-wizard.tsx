"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormError, Input, Label, Textarea } from "@/components/ui/input";
import type { ClarifyingQuestion } from "@/lib/validation";

const EXAMPLE_REQUEST =
  "Hey! I need a website for my bakery. Something modern that shows our menu and lets people order cakes. Not sure what it should cost or how long it takes. We have a logo already. Would love it before the holidays!";

type Step =
  | { name: "brief" }
  | { name: "questions"; briefId: string; questions: ClarifyingQuestion[]; demo: boolean }
  | { name: "answers"; briefId: string; questions: ClarifyingQuestion[]; demo: boolean };

async function api<T>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string; details?: string };
  } | null;
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error?.details || json?.error?.message || "Request failed.");
  }
  return json.data as T;
}

export function NewBriefWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "brief" });
  const [raw, setRaw] = useState("");
  const [projectType, setProjectType] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setError(null);
    if (raw.trim().length < 20) {
      setError("Paste at least a sentence or two about the client request.");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{
        brief_id: string;
        questions: ClarifyingQuestion[];
        demo_mode: boolean;
      }>("/api/briefs", "POST", {
        raw_request: raw.trim(),
        project_type: projectType.trim() || undefined,
        project_name: projectName.trim() || undefined,
        client_name: clientName.trim() || undefined,
        currency: currency.trim().toUpperCase() || "USD",
      });
      setStep({ name: "questions", briefId: data.brief_id, questions: data.questions, demo: data.demo_mode });
      setAnswers(Object.fromEntries(data.questions.map((q) => [q.id, ""])));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze the brief.");
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (step.name !== "questions") return;
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ proposal_id: string }>("/api/briefs", "PUT", {
        brief_id: step.briefId,
        answers: step.questions.map((q) => ({
          question_id: q.id,
          answer: (answers[q.id] ?? "").trim(),
        })),
      });
      router.push(`/dashboard/proposals/${data.proposal_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the proposal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
          001 Brief → 002 Clarify → 003 Proposal
        </p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Turn a vague request into a <em className="text-primary">proposal.</em>
        </h1>
      </div>

      <StepIndicator current={step.name === "brief" ? 0 : 1} />

      {step.name === "brief" && (
        <Card>
          <CardHeader>
            <CardTitle>Paste the client request</CardTitle>
            <CardDescription>
              Copy it verbatim — typos and all. The AI will spot what&apos;s missing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <Label htmlFor="raw">Client request</Label>
              <Textarea
                id="raw"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="Paste the email, DM, or message thread…"
                rows={7}
                maxLength={4000}
              />
              <p className="mt-1 text-right font-mono text-[11px] text-ink-mute">
                {raw.length}/4000
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pname">Project name (optional)</Label>
                <Input
                  id="pname"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Fern & Field website"
                  maxLength={140}
                />
              </div>
              <div>
                <Label htmlFor="cname">Client name (optional)</Label>
                <Input
                  id="cname"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Fern & Field Café"
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="ptype">Project type (optional)</Label>
                <Input
                  id="ptype"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  placeholder="e.g. Brand design, Web app"
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
                  placeholder="USD"
                  maxLength={3}
                  className="font-mono uppercase"
                />
              </div>
            </div>
            <FormError message={error} />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={analyze} loading={loading} disabled={loading}>
                <Sparkles aria-hidden />
                Analyze with AI
                <ArrowRight aria-hidden />
              </Button>
              <button
                type="button"
                onClick={() => setRaw(EXAMPLE_REQUEST)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Try an example request
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {step.name !== "brief" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Answer a few questions</CardTitle>
              <Badge variant="ai">
                <Sparkles className="size-3" aria-hidden /> AI-assisted
              </Badge>
              {step.demo && <Badge variant="sandbox">demo mode — no AI key</Badge>}
            </div>
            <CardDescription>
              The AI identified gaps in the request. Answer what you can — optional
              questions can be skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {step.questions.map((q, i) => (
              <div key={q.id}>
                <Label htmlFor={q.id}>
                  {String(i + 1).padStart(2, "0")} · {q.question}
                  {q.optional && (
                    <span className="ml-2 font-sans normal-case text-ink-mute">(optional)</span>
                  )}
                </Label>
                {q.why && (
                  <p className="mb-1.5 flex items-start gap-1.5 text-xs text-ink-mute">
                    <Lightbulb className="mt-0.5 size-3 shrink-0" aria-hidden />
                    {q.why}
                  </p>
                )}
                <Textarea
                  id={q.id}
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                  }
                  placeholder={q.optional ? "Skip if unknown…" : "Your answer…"}
                  rows={2}
                  maxLength={1000}
                />
              </div>
            ))}
            <FormError message={error} />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generate} loading={loading} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Drafting proposal…
                  </>
                ) : (
                  <>
                    <Sparkles aria-hidden />
                    Generate proposal draft
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setStep({ name: "brief" })}
                className="text-sm font-medium text-ink-soft hover:text-ink hover:underline"
              >
                Back to brief
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Paste request", "Clarify", "Review draft"];
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`grid size-7 place-items-center rounded-full font-mono text-[11px] ${
              i <= current ? "bg-ink text-white" : "border border-line-strong bg-white text-ink-mute"
            }`}
          >
            {i + 1}
          </span>
          <span className={`text-xs font-medium ${i <= current ? "text-ink" : "text-ink-mute"}`}>
            {label}
          </span>
          {i < steps.length - 1 && <span aria-hidden className="mx-1 h-px w-6 bg-line-strong" />}
        </li>
      ))}
    </ol>
  );
}
