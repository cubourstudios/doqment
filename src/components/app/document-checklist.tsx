import Link from "next/link";
import { CheckIcon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DISCLAIMER_TEXT, requiresDisclaimer } from "@/lib/disclaimers";
import { DOC_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { ProjectChecklist } from "@/lib/guidance/service";
import type { ChecklistItem, GuidancePriority } from "@/lib/guidance/types";

/**
 * The checklist — PRD §2 step 4, the moment the product justifies itself.
 *
 * Two things drive the design.
 *
 * First, the rationale is always visible rather than behind a tooltip. The
 * reason someone would pay for this is that they do not know what an SOW is;
 * hiding the explanation defeats the feature.
 *
 * Second, and less obvious: the product's whole claim is that it can tell you
 * what matters most. A list where every row carries an identically weighted
 * button contradicts that claim on sight, however carefully the priorities are
 * labelled. So the action itself carries the priority — filled for essential,
 * outlined for recommended, quiet for situational — and finished work recedes
 * to a single line instead of holding a full card.
 */

const BADGE_VARIANT: Record<
  GuidancePriority,
  "essential" | "recommended" | "situational"
> = {
  essential: "essential",
  recommended: "recommended",
  situational: "situational",
};

/**
 * The action's weight is the priority. Explicit rather than derived, so adding
 * a priority forces a decision about how loudly it should ask.
 */
const BUTTON_VARIANT: Record<GuidancePriority, "default" | "outline" | "ghost"> =
  {
    essential: "default",
    recommended: "outline",
    situational: "ghost",
  };

export function DocumentChecklist({
  projectId,
  checklist,
}: {
  projectId: string;
  checklist: ProjectChecklist;
}) {
  const { items, generated, completeness } = checklist;

  const showsContracts = items.some((item) => requiresDisclaimer(item.docType));

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        No document recommendations for this project yet.
      </p>
    );
  }

  const done = items.filter((item) => generated.has(item.docType));
  const todo = items.filter((item) => !generated.has(item.docType));

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium">
            {completeness.done} of {completeness.total} essentials done
          </span>
          {completeness.percent === 100 ? (
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
              All covered
            </span>
          ) : null}
        </div>
        {/* The bar and the fraction say the same thing, so the percentage is
            not printed a third time — it lives in the accessible name. */}
        <Progress
          value={completeness.percent}
          aria-label={`${completeness.percent}% of essential documents created`}
        />
      </div>

      {todo.length > 0 ? (
        <ul className="grid gap-2">
          {todo.map((item) => (
            <TodoRow key={item.docType} item={item} projectId={projectId} />
          ))}
        </ul>
      ) : null}

      {done.length > 0 ? (
        <div className="grid gap-2">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Done
          </h3>
          <ul className="grid gap-1.5">
            {done.map((item) => (
              <DoneRow key={item.docType} item={item} projectId={projectId} />
            ))}
          </ul>
        </div>
      ) : null}

      {showsContracts ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {DISCLAIMER_TEXT}
        </p>
      ) : null}
    </div>
  );
}

function TodoRow({
  item,
  projectId,
}: {
  item: ChecklistItem;
  projectId: string;
}) {
  const label = DOC_TYPE_LABELS[item.docType];

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{label}</h3>
        <Badge variant={BADGE_VARIANT[item.priority]}>
          {PRIORITY_LABELS[item.priority]}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-1 text-sm">{item.rationale}</p>

      {/* Only an essential gets the full-width primary treatment. A quieter
          action that still spans the card reads as a stray label rather than
          a button, and five equally wide buttons put every item back on the
          same footing — which is the thing this layout exists to avoid. */}
      <Button
        asChild
        variant={BUTTON_VARIANT[item.priority]}
        size="sm"
        className={
          item.priority === "essential"
            ? "mt-3 w-full sm:w-auto"
            : "mt-3 -ml-3 w-auto"
        }
      >
        <Link
          href={`/projects/${projectId}/documents/new?type=${item.docType}`}
        >
          <PlusIcon />
          {/* The heading is directly above, so the button does not repeat the
              document name — but the accessible name still carries it, since a
              screen-reader user hearing five identical "Create" buttons has no
              way to tell them apart. */}
          Create
          <span className="sr-only"> {label}</span>
        </Link>
      </Button>
    </li>
  );
}

function DoneRow({
  item,
  projectId,
}: {
  item: ChecklistItem;
  projectId: string;
}) {
  const label = DOC_TYPE_LABELS[item.docType];

  return (
    <li>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <CheckIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
          <span className="text-muted-foreground truncate text-sm">{label}</span>
        </span>

        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link
            href={`/projects/${projectId}/documents/new?type=${item.docType}`}
          >
            Add another
            <span className="sr-only"> {label}</span>
          </Link>
        </Button>
      </div>
    </li>
  );
}
