"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the technical detail for the server logs, never render it to users.
    console.error("[dashboard] render failed:", error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col gap-3 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-ink-mute">
        Your data was not changed. Try loading the dashboard again — if it keeps
        failing, check the server logs.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mx-auto inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-deep"
      >
        Try again
      </button>
      {error.digest && (
        <p className="font-mono text-[11px] text-ink-mute">Reference: {error.digest}</p>
      )}
    </div>
  );
}
