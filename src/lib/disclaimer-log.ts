import "server-only";

import { db } from "@/db";
import { disclaimerLogs } from "@/db/schema";

/**
 * Recording that a disclaimer was accepted.
 *
 * Split from ./disclaimers.ts so the text and the rule can be imported by
 * client components without dragging the database driver into the browser
 * bundle. `server-only` makes that boundary enforced rather than remembered.
 *
 * The honest version of a disclaimer is evidence it was actually shown, rather
 * than a claim in the terms of service that it must have been.
 */

/**
 * Record an acceptance.
 *
 * The table is append-only at the RLS level — SELECT and INSERT policies, no
 * UPDATE or DELETE — so this record cannot later be rewritten, including by
 * the user it concerns. An audit trail its own subject can edit is not one.
 *
 * Failures are swallowed deliberately: losing the log line is bad, but failing
 * a document the user has already filled in, in order to record that they read
 * a warning, would be worse.
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
