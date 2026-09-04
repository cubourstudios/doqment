import Link from "next/link";
import { ArrowUpRightIcon, GaugeIcon } from "lucide-react";

import { remaining, type Allowance } from "@/lib/billing/allowance";

/**
 * What is left of the free plan, kept in view.
 *
 * A limit the user cannot see is one they discover by hitting it, which is the
 * moment they are least willing to be sold to. Every figure here comes from
 * the same place the limit is enforced, so this cannot disagree with the
 * billing page or with the error shown when a create is refused — which is
 * exactly what it used to do.
 *
 * The link goes to billing, which is where upgrading happens. It does not say
 * "Top up": there is nothing to top up with until credits exist.
 */
export function AllowanceStrip({ allowance }: { allowance: Allowance }) {
  if (allowance.plan === "pro") {
    return (
      <p className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
        <GaugeIcon className="size-4 shrink-0" />
        Pro — unlimited documents and projects, no watermark.
      </p>
    );
  }

  const documentsLeft = remaining(
    allowance.documentsUsed,
    allowance.documentsLimit,
  );
  const projectsLeft = remaining(allowance.projectsUsed, allowance.projectsLimit);
  const spent = documentsLeft === 0;

  return (
    <div className="bg-muted/40 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5 text-sm">
      <GaugeIcon className="text-muted-foreground size-4 shrink-0" />

      <span className="tabular-nums">
        <strong className="font-medium">
          {documentsLeft} of {allowance.documentsLimit}
        </strong>
        <span className="text-muted-foreground"> documents left this month</span>
      </span>

      <span className="tabular-nums">
        <strong className="font-medium">
          {projectsLeft} of {allowance.projectsLimit}
        </strong>
        <span className="text-muted-foreground"> projects left</span>
      </span>

      <Link
        href="/settings/billing"
        className="text-primary hover:bg-accent -my-1.5 ml-auto inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-medium"
      >
        {spent ? "Upgrade for unlimited" : "View plan"}
        <ArrowUpRightIcon className="size-4" />
      </Link>
    </div>
  );
}
