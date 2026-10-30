import { NextResponse } from "next/server";
import { createClient } from "./supabase/server.ts";
import { formatZodError } from "./validation.ts";
import { z } from "zod";

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(
  message: string,
  status = 400,
  details?: string,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { message, details } },
    { status },
  );
}

/** Returns the authenticated user or a 401 response. Never trusts client ids. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      user: null,
      supabase: null,
      response: fail("Please sign in to continue.", 401),
    } as const;
  }
  return { user, supabase, response: null } as const;
}

export function zodFail(error: z.ZodError) {
  return fail("Please check your input and try again.", 422, formatZodError(error));
}

/** Convert thrown errors into safe API responses (no secrets, no stack). */
export function toApiError(error: unknown): NextResponse {
  if (error instanceof Response) return error as unknown as NextResponse;
  if (error && typeof error === "object" && "status" in error) {
    const e = error as { message?: string; status?: number; code?: string };
    const status =
      typeof e.status === "number" && e.status >= 400 && e.status < 600
        ? e.status
        : 500;
    return fail(
      status === 500
        ? "Something went wrong. Please try again."
        : (e.message ?? "Request failed."),
      status,
    );
  }
  return fail("Something went wrong. Please try again.", 500);
}
