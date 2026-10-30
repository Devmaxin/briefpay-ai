import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-sans text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-[0_8px_20px_-8px_rgb(36_86_224/0.6)] hover:bg-primary-deep active:translate-y-px",
        secondary:
          "border border-line-strong bg-white text-ink hover:border-ink-soft hover:bg-parchment",
        ghost: "text-ink-soft hover:bg-parchment-deep hover:text-ink",
        success: "bg-verified text-white hover:brightness-95",
        danger: "bg-danger text-white hover:brightness-95",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled ?? loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
