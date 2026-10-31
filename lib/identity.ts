/** Pure identity helpers — safe to import from client and server code. */

function cleanName(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Best available human name: profile name → email local part → fallback. */
export function displayName(
  fullName?: string | null,
  email?: string | null,
  fallback = "there",
): string {
  const name = cleanName(fullName);
  if (name) return name;
  const local = (email ?? "").split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!local) return fallback;
  return local.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First word of the display name, for "Welcome back, Sam". */
export function firstName(
  fullName?: string | null,
  email?: string | null,
  fallback = "there",
): string {
  return displayName(fullName, email, fallback).split(" ")[0] || fallback;
}

export function initials(
  fullName?: string | null,
  email?: string | null,
): string {
  const name = displayName(fullName, email, "");
  if (!name) return "•";
  const parts = name.split(" ").filter(Boolean);
  const letters =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 1);
  return letters.toUpperCase();
}
