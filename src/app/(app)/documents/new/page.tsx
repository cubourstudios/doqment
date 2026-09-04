import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { entitlementFor, getAllowance } from "@/lib/billing/allowance";
import { getUserPlan } from "@/lib/billing/plans";
import { DOC_TYPE_LABELS } from "@/lib/labels";
import { docTypeEnum } from "@/db/schema";
import type { DocType } from "@/lib/guidance/types";

export const metadata: Metadata = { title: "Create a document" };

/**
 * What each type is for, in the words of someone who does not yet know they
 * need it. "Statement of Work" means nothing to a first-time freelancer; "what
 * you will deliver, by when" does.
 */
const PURPOSE: Record<DocType, string> = {
  proposal: "Turn a conversation into an agreed scope and price",
  service_agreement: "The terms you can point back to if payment is disputed",
  sow: "What you will deliver, by when, and how many revisions",
  nda: "Protect confidential information before they share it",
  invoice: "Get paid, with the tax fields your client's accountant expects",
  payment_reminder: "Chase a late payment without souring the relationship",
};

/**
 * Mode A — a document without a project.
 *
 * Someone who arrived needing an NDA today should not have to model their
 * business first. This path never asks for a project; a document made here can
 * be attached to one afterwards.
 */
export default async function NewDocumentPage() {
  const { userId } = await requireProfile();

  // Real usage, read the way the limit is enforced — the picker must not offer
  // a document that the creation path will then refuse.
  const allowance = await getAllowance(userId, await getUserPlan(userId));
  const entitlement = entitlementFor(allowance);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground -my-2 mb-2 inline-flex min-h-11 items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Home
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">
        Create a document
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Pick a type, then choose the project it belongs to.
      </p>

      {/* Said once, up front, rather than per tile: the allowance is a property
          of the month, not of the document type. */}
      <p
        className={`mt-3 text-sm ${entitlement.allowed ? "text-muted-foreground" : "text-destructive"}`}
      >
        {entitlement.reason}
        {entitlement.allowed ? null : (
          <>
            {" "}
            <Link href="/settings/billing" className="underline underline-offset-4">
              Upgrade for unlimited
            </Link>
            .
          </>
        )}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {docTypeEnum.enumValues.map((docType) => (
            <li key={docType} className="min-w-0">
              <Link
                href={`/documents/new/${docType}`}
                className="hover:border-foreground/20 hover:bg-accent/40 flex min-h-24 flex-col justify-between gap-2 rounded-lg border p-4 transition-colors"
              >
                <span>
                  <span className="block font-medium">
                    {DOC_TYPE_LABELS[docType]}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-sm text-pretty">
                    {PURPOSE[docType]}
                  </span>
                </span>

              </Link>
            </li>
        ))}
      </ul>
    </div>
  );
}
