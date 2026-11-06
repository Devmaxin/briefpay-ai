import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5", className)}
      aria-label="B BriefPay AI home"
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-xl bg-ink font-display text-lg font-bold text-white italic"
      >
        B
      </span>{" "}
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        BriefPay <span className="text-ai italic">AI</span>
      </span>
    </Link>
  );
}

export function WorkflowStep({
  number,
  label,
  active,
}: {
  number: string;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase",
        active ? "text-primary-deep" : "text-ink-mute",
      )}
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full border text-[10px]",
          active
            ? "border-primary bg-primary-ink"
            : "border-line-strong bg-white",
        )}
      >
        {number}
      </span>
      {label}
    </span>
  );
}
