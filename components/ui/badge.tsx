import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wide uppercase",
  {
    variants: {
      variant: {
        draft: "border-line-strong bg-parchment-deep text-ink-soft",
        approved: "border-primary/30 bg-primary-ink text-primary-deep",
        paid: "border-verified/30 bg-verified-soft text-verified",
        ai: "border-ai/30 bg-ai-soft text-ai",
        sandbox: "border-caution/40 bg-caution-soft text-caution",
        danger: "border-danger/30 bg-danger-soft text-danger",
        neutral: "border-line bg-white text-ink-mute",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid"
      ? "paid"
      : status === "approved"
        ? "approved"
        : status === "draft"
          ? "draft"
          : "neutral";
  const dot =
    status === "paid"
      ? "bg-verified"
      : status === "approved"
        ? "bg-primary"
        : "bg-ink-mute";
  return (
    <Badge variant={variant}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
      {status}
    </Badge>
  );
}
