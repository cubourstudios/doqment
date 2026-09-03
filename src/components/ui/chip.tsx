import * as React from "react";
import { cn } from "@/lib/utils";

// Chip/pill per docs/design-system.md §8.
export function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill bg-primary-tint px-4 py-1.5 text-xs font-medium text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}
