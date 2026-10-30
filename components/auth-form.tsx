"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/brand";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(
          authError.message.includes("Invalid login")
            ? "Incorrect email or password."
            : authError.message,
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-16">
      <Logo />
      <Card className="mt-8 w-full">
        <CardHeader>
          <p className="font-mono text-[11px] tracking-[0.1em] text-ai uppercase">
            {isSignup ? "001 · Create account" : "001 · Welcome back"}
          </p>
          <CardTitle className="font-display text-3xl">
            {isSignup ? (
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
            {isSignup
              ? "Free for the hackathon demo. No credit card required."
              : "Sign in to manage your proposals and payments."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <FormError message={error} />
            <Button type="submit" loading={loading} className="w-full">
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-ink-mute">
            {isSignup ? "Already have an account? " : "New to BriefPay? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
