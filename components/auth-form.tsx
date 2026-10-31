"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  friendlyAuthError,
  needsEmailConfirmation,
  safeNextPath,
} from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/brand";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Phase = "form" | "confirm";

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "login" | "signup";
  nextPath?: string;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const destination = safeNextPath(nextPath);

  const [phase, setPhase] = useState<Phase>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
    if (isSignup && password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!isSignup && password.length === 0) return "Enter your password.";
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsConfirm(false);

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const cleanEmail = email.trim();

      if (isSignup) {
        const { data, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (authError) {
          setError(friendlyAuthError(authError.message, "signup"));
          return;
        }
        if (!data.session) {
          // Email confirmation is enabled on the Supabase project.
          setPhase("confirm");
          setNotice(`We sent a confirmation link to ${cleanEmail}.`);
          return;
        }
        router.replace(destination);
        router.refresh();
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (authError) {
        setError(friendlyAuthError(authError.message, "login"));
        setNeedsConfirm(needsEmailConfirmation(authError.message));
        return;
      }
      router.replace(destination);
      router.refresh();
    } catch {
      setError(
        isSignup
          ? "We could not create your account. Check your connection and try again."
          : "We could not sign you in. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (authError) {
        setError(friendlyAuthError(authError.message, "signup"));
        return;
      }
      setNotice(`A new confirmation link is on its way to ${email.trim()}.`);
    } catch {
      setError("We could not resend the email. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  const isConfirming = phase === "confirm";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <Logo />
      <Card className="mt-8 w-full">
        <CardHeader>
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            {isConfirming
              ? "002 · Confirm email"
              : isSignup
                ? "001 · Create account"
                : "001 · Welcome back"}
          </p>
          <CardTitle className="font-display text-3xl">
            {isConfirming ? (
              "Check your inbox."
            ) : isSignup ? (
              <>
                Start turning <em className="text-ai">vague</em> into paid.
              </>
            ) : (
              <>
                Pick up where <em>you left off.</em>
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isConfirming
              ? "Your account exists but is not active until you confirm the address."
              : isSignup
                ? "Free for the hackathon demo. No credit card required."
                : "Sign in to manage your proposals and payments."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConfirming ? (
            <div className="flex flex-col gap-4">
              <span
                aria-hidden
                className="grid size-11 place-items-center rounded-2xl bg-ai-soft text-ai"
              >
                <MailCheck className="size-5" />
              </span>
              <p className="text-sm leading-relaxed text-ink-soft">
                We sent a confirmation link to{" "}
                <span className="font-semibold text-ink">{email.trim()}</span>. Open
                it in this browser, then sign in to reach your dashboard.
              </p>
              <FormError message={error} />
              {notice && (
                <p
                  role="status"
                  className="rounded-xl border border-verified/30 bg-verified-soft px-4 py-3 text-sm text-verified"
                >
                  {notice}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resendConfirmation}
                  loading={resending}
                  disabled={resending}
                  className="w-full"
                >
                  Resend confirmation email
                </Button>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-primary hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              {isSignup && (
                <div>
                  <Label htmlFor="full_name">Your name (optional)</Label>
                  <Input
                    id="full_name"
                    type="text"
                    autoComplete="name"
                    placeholder="Sam Rivera"
                    maxLength={80}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                  <p className="mt-1 text-xs text-ink-mute">
                    Used to personalise your dashboard.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@studio.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  aria-invalid={Boolean(error)}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder={isSignup ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={isSignup ? 8 : undefined}
                  aria-invalid={Boolean(error)}
                />
              </div>
              <FormError message={error} />
              {notice && (
                <p
                  role="status"
                  className="rounded-xl border border-verified/30 bg-verified-soft px-4 py-3 text-sm text-verified"
                >
                  {notice}
                </p>
              )}
              {needsConfirm && (
                <button
                  type="button"
                  onClick={resendConfirmation}
                  disabled={resending}
                  className="self-start text-sm font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {resending ? "Sending…" : "Resend confirmation email"}
                </button>
              )}
              <Button type="submit" loading={loading} disabled={loading} className="w-full">
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>
          )}

          {phase === "form" && (
            <p className="mt-4 text-center text-sm text-ink-mute">
              {isSignup ? "Already have an account? " : "New to BriefPay? "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-semibold text-primary hover:underline"
              >
                {isSignup ? "Sign in" : "Create an account"}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
