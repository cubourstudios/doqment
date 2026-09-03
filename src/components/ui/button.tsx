import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Button anatomy per docs/design-system.md §6 (Buttons). Every variant keeps a
// 44px minimum tap target per CLAUDE.md §2.4, at every breakpoint.
const buttonVariants = cva(
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        outline: "border border-heading/20 bg-transparent text-heading hover:bg-surface-muted",
        text: "bg-transparent px-2 text-primary hover:text-primary-hover",
        inverted: "rounded-pill bg-white text-heading hover:bg-surface-muted",
      },
      size: {
        default: "min-h-[44px]",
        sm: "min-h-[44px] px-4 text-sm",
        lg: "min-h-[52px] px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
