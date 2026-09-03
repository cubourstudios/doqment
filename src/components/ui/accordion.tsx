"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// FAQ accordion per docs/design-system.md §11 (Interaction Patterns): chevron
// rotates 180°, answer expands below in muted gray, several rows can be open.
export function AccordionItem({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();

  return (
    <div className="border-b border-heading/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-ui text-base font-semibold text-heading">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 flex-shrink-0 text-heading/60 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        id={id}
        className={cn(
          "overflow-hidden transition-[max-height] duration-200",
          open ? "max-h-96" : "max-h-0"
        )}
      >
        <p className="pb-5 pr-8 text-sm text-heading/70 md:text-base">{children}</p>
      </div>
    </div>
  );
}

export function Accordion({ children }: { children: React.ReactNode }) {
  return <div className="divide-y-0">{children}</div>;
}
