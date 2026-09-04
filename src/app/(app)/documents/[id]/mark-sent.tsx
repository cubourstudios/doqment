"use client";

import { SendIcon } from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import { markInvoiceSent } from "../actions";

/**
 * Moving an invoice from draft to sent.
 *
 * Until now this only existed inside the status dropdown further down the
 * page, which meant most invoices would never leave "draft" — and a draft is
 * excluded from both the outstanding total and the overdue check. A freelancer
 * would email an invoice, watch the dashboard report nothing owed, and have no
 * idea the product had stopped tracking it.
 *
 * It sits beside the download because downloading is what someone does
 * immediately before emailing. Deliberately not automatic on download: people
 * download to check their own work, and silently telling a client's invoice it
 * has been sent when it has not is a worse error than asking.
 */
export function MarkSent({
  documentId,
  dueDate,
}: {
  documentId: string;
  dueDate: string | null;
}) {
  return (
    <form action={markInvoiceSent} className="grid gap-2">
      <input type="hidden" name="documentId" value={documentId} />

      <div className="bg-muted/50 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">Sent it to your client?</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {dueDate
            ? `Mark it sent and we'll start counting down to ${dueDate}, then flag it the day it goes overdue.`
            : "Mark it sent so it counts towards what you're owed."}
        </p>

        <SubmitButton
          pendingLabel="Marking…"
          className="mt-3 w-full sm:w-auto"
          variant="outline"
        >
          <SendIcon />
          Mark as sent
        </SubmitButton>
      </div>
    </form>
  );
}
