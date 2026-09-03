import * as React from "react";
import { cn } from "@/lib/utils";

// Core content container per docs/design-system.md §3 (Layout & Spacing).
export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-content px-4 md:px-8 lg:px-16", className)}>
      {children}
    </div>
  );
}
