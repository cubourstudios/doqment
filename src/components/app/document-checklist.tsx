import Link from "next/link";
import { CheckIcon, PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DISCLAIMER_TEXT, requiresDisclaimer } from "@/lib/disclaimers";
import { DOC_TYPE_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import type { ProjectChecklist } from "@/lib/guidance/service";
import type { GuidancePriority } from "@/lib/guidance/types";

const BADGE_VARIANT: Record<
  GuidancePriority,
  "essential" | "recommended" | "situational"
> = {
  essential: "essential",
  recommended: "recommended",
  situational: "situational",
};

/**
 * The checklist — PRD §2 step 4, the moment the product justifies itself.
 *
 * Every item carries its rationale in plain sight rather than behind a tooltip
 * or an info icon. The reason someone would pay for this is that they do not
 * know what an SOW is; hiding the explanation behind a tap defeats the feature.
 */
export function DocumentChecklist({
  projectId,
  checklist,
}: {
  projectId: string;
  checklist: ProjectChecklist;
}) {
  const { items, generated, completeness } = checklist;

  // Shown whenever the checklist recommends anything with legal weight, in the
  // same place as the recommendation rather than behind a link. Someone who
  // does not know what an SOW is cannot judge whether they need a lawyer to
  // look at one.
  const showsContracts = items.some((item) => requiresDisclaimer(item.docType));

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
        No document recommendations for this project yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-medium">
            {completeness.done} of {completeness.total} essential documents done
          </span>
          <span className="text-muted-foreground text-sm">
            {completeness.percent}%
          </span>
        </div>
        <Progress
          value={completeness.percent}
          aria-label={`${completeness.percent}% of essential documents created`}
        />
      </div>

      <ul className="grid gap-3">
        {items.map((item) => {
          const done = generated.has(item.docType);

          return (
            <li
              key={item.docType}
              className="rounded-lg border p-4"
              data-done={done}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">
                      {DOC_TYPE_LABELS[item.docType]}
                    </h3>
                    {done ? (
                      <Badge variant="success">
                        <CheckIcon />
                        Done
                      </Badge>
                    ) : (
                      <Badge variant={BADGE_VARIANT[item.priority]}>
                        {PRIORITY_LABELS[item.priority]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {item.rationale}
                  </p>
                </div>
              </div>

              {/* Full-width on mobile: this is the primary action on the
                  screen, and a small right-aligned button is an awkward
                  thumb reach. */}
              <Button
                asChild
                variant={done ? "outline" : "default"}
                className="mt-3 w-full sm:w-auto"
              >
                <Link
                  href={`/projects/${projectId}/documents/new?type=${item.docType}`}
                >
                  {done ? (
                    "Create another"
                  ) : (
                    <>
                      <PlusIcon />
                      Create {DOC_TYPE_LABELS[item.docType].toLowerCase()}
                    </>
                  )}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>

      {showsContracts ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs leading-relaxed">
          {DISCLAIMER_TEXT}
        </p>
      ) : null}
    </div>
  );
}
