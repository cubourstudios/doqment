import * as React from "react";
import { cn } from "@/lib/utils";

// Standard resting card per docs/design-system.md §5/§7 — soft, cool-tinted
// shadow, 8px radius (--radius-md).
export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md bg-surface p-6 shadow-card", className)}>
      {children}
    </div>
  );
}
