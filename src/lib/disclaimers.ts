import { db } from "@/db";
import { disclaimerLogs } from "@/db/schema";
import type { DocType } from "@/lib/guidance/types";

/**
 * Disclaimers (PRD F11).
 *
 * This product generates contracts from templates. It is not a law firm and
 * the templates are not legal advice, and that has to be said plainly rather
 * than buried in terms nobody reads — a freelancer relying on an unreviewed
 * service agreement for a large engagement is exactly the person who gets hurt
 * if we imply more than we can stand behind.
 *
 * Acceptances are logged because the honest version of this is evidence that
 * the warning was actually shown, rather than a claim in the terms of service
 * that it must have been.
 */

/** Contracts carry real legal weight; an invoice is arithmetic. */
const NEEDS_DISCLAIMER: DocType[] = [
  "proposal",
  "service_agreement",
  "sow",
  "nda",
];

export function requiresDisclaimer(docType: DocType): boolean {
  return NEEDS_DISCLAIMER.includes(docType);
}

export const DISCLAIMER_TEXT =
  "Doqment generates documents from templates and is not a law firm. " +
  "This is not legal advice. For anything high-stakes, have a lawyer review " +
  "the result before you rely on it.";

/**
 * Record that the disclaimer was shown and accepted for a generated document.
 *
 * The table is append-only at the RLS level — SELECT and INSERT policies, no
 * UPDATE or DELETE — so this record cannot later be rewritten, including by
 * the user it concerns. An audit trail its own subject can edit is not one.
 *
 * Failures are swallowed deliberately: losing the log line is bad, but failing
 * a document the user has already paid attention to, in order to record that
 * they read a warning, would be worse.
 */
export async function logDisclaimerAcceptance(input: {
  userId: string;
  documentId: string;
  templateVersion: number;
}): Promise<void> {
  try {
    await db.insert(disclaimerLogs).values({
      userId: input.userId,
      documentId: input.documentId,
      templateVersion: input.templateVersion,
    });
  } catch (error) {
    console.error("failed to log disclaimer acceptance", error);
  }
}
