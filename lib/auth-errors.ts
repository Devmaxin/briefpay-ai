/**
 * Supabase auth error → human copy. Pure so it can be unit tested.
 * Supabase messages are stable enough to match on; we never surface raw
 * provider text because it is inconsistently worded and occasionally
 * leaks implementation details.
 */
export type AuthMode = "login" | "signup";

export function friendlyAuthError(message: string, mode: AuthMode): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "Incorrect email or password. Check your details and try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the confirmation link.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account already exists for this email. Sign in instead.";
  }
  if (m.includes("password should be at least") || m.includes("password is too short")) {
    return "Password must be at least 8 characters.";
  }
  if (m.includes("rate limit") || m.includes("too many requests") || m.includes("security purposes")) {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (m.includes("invalid email") || m.includes("email address is invalid")) {
    return "Enter a valid email address.";
  }
  if (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("fetch failed") ||
    m.includes("timeout")
  ) {
    return "Could not reach the authentication service. Check your connection and try again.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "New signups are disabled for this project. Ask the owner to enable email signups.";
  }

  return mode === "signup"
    ? "We could not create your account. Please try again."
    : "We could not sign you in. Please try again.";
}

export function needsEmailConfirmation(message: string): boolean {
  return message.toLowerCase().includes("email not confirmed");
}

/**
 * Only allow internal, single-slash paths as a post-login destination.
 * Blocks open redirects such as `https://evil.test` or `//evil.test`.
 */
export function safeNextPath(
  next?: string | null,
  fallback = "/dashboard",
): string {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value.startsWith("/login") || value.startsWith("/signup") || value.startsWith("/auth")) {
    return fallback;
  }
  return value;
}
