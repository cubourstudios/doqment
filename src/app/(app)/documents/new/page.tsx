import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { getAllowance, entitlementFor } from "@/lib/billing/allowance";
import { getUserPlan } from "@/lib/billing/plans";
import { formatMinor } from "@/lib/invoice/money";
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
  const { userId, profile } = await requireProfile();
  const currency = profile.currency ?? "INR";

  // TODO(credits): mocked. See src/lib/billing/allowance.ts.
  const allowance = getAllowance(await getUserPlan(userId), currency);

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
        Pick a type. You can attach it to a project later, or never.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {docTypeEnum.enumValues.map((docType) => {
          const entitlement = entitlementFor(docType, allowance);

          return (
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

                {/*
                  The price is stated on the way in, not at the end. Someone
                  who would rather not pay should find that out before filling
                  a form, not after.
                */}
                <span className="text-muted-foreground text-xs">
                  {entitlement.cost > 0
                    ? formatMinor(BigInt(entitlement.cost), currency)
                    : entitlement.reason}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
