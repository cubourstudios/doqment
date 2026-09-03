import Link from "next/link";
import { CoinsIcon, PlusIcon } from "lucide-react";

import { formatMinor } from "@/lib/invoice/money";
import type { Allowance } from "@/lib/billing/allowance";

/**
 * What you have left, kept in view.
 *
 * Allowance and credit balance live on the home screen rather than inside
 * Settings: a limit the user cannot see is one they only discover by hitting
 * it, which is the moment they are least willing to be sold to.
 *
 * TODO(credits): the numbers come from the mocked src/lib/billing/allowance.ts.
 * "Top up" has no destination until credit packs exist.
 */
export function AllowanceStrip({ allowance }: { allowance: Allowance }) {
  if (allowance.plan === "pro") {
    return (
      <div className="text-muted-foreground mt-4 flex items-center gap-2 text-sm">
        <CoinsIcon className="size-4 shrink-0" />
        <span>Pro — unlimited documents, no watermark.</span>
      </div>
    );
  }

  const invoices = allowance.freeInvoicesRemaining ?? 0;

  return (
    <div className="bg-muted/40 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5 text-sm">
      <span className="flex items-center gap-2">
        <CoinsIcon className="text-muted-foreground size-4 shrink-0" />
        <span className="tabular-nums">
          <strong className="font-medium">{invoices}</strong>
          <span className="text-muted-foreground"> free invoices left</span>
        </span>
      </span>

      <span className="tabular-nums">
        <strong className="font-medium">{allowance.credits}</strong>
        <span className="text-muted-foreground"> credits</span>
      </span>

      <span className="text-muted-foreground hidden sm:inline">
        Other documents{" "}
        {formatMinor(BigInt(allowance.perDocumentCost), allowance.currency)} each
      </span>

      {/* 44px minimum target, so it stays tappable on a phone. */}
      <Link
        href="/settings/billing"
        className="text-primary hover:bg-accent ml-auto -my-1.5 inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-medium"
      >
        <PlusIcon className="size-4" />
        Top up
      </Link>
    </div>
  );
}
