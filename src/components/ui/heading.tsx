import * as React from "react";
import { cn } from "@/lib/utils";

// Two-tone headline pattern from docs/design-system.md §2: wrap the accent
// clause in <Accent>. Type scale steps up at md:/lg:, never down (CLAUDE.md §2.4).
export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="text-primary">{children}</span>;
}

export function Heading({
  as = "h2",
  size = "section",
  align = "left",
  invert = false,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  size?: "hero" | "section" | "card";
  align?: "left" | "center";
  invert?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = as;
  const sizeClasses = {
    hero: "text-3xl sm:text-4xl md:text-5xl font-medium leading-tight",
    section: "text-2xl md:text-4xl lg:text-[42px] font-medium leading-tight",
    card: "text-base md:text-xl font-semibold leading-snug",
  }[size];

  return (
    <Tag
      className={cn(
        sizeClasses,
        align === "center" ? "text-center" : "text-left",
        invert ? "text-white" : "text-heading",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function Lead({
  align = "left",
  invert = false,
  className,
  children,
}: {
  align?: "left" | "center";
  invert?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "font-body text-base font-medium md:text-lg",
        align === "center" ? "text-center" : "text-left",
        invert ? "text-white/80" : "text-heading/70",
        className
      )}
    >
      {children}
    </p>
  );
}
