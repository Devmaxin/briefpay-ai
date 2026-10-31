export function ConfigNotice() {
  return (
    <p className="mx-auto mt-6 max-w-md rounded-xl border border-caution/40 bg-caution-soft px-4 py-3 text-sm text-caution">
      Supabase is not configured yet. Add{" "}
      <code className="font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
      to <code className="font-mono text-[12px]">.env.local</code>, then restart the
      dev server.
    </p>
  );
}
