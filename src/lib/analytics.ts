import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { events } from "@/db/schema";

/**
 * Product analytics (PRD §7).
 *
 * Events are written to our own table rather than shipped to a third party.
 * For the questions this product actually needs answered — does the checklist
 * lead to a generated document, where does onboarding lose people — a table we
 * can query is enough, and it means a freelancer's client names never leave
 * the database.
 *
 * If PostHog is wanted later, this is the seam: change the implementation
 * here and every call site keeps working.
 */

export type EventName =
  | "signup_completed"
  | "onboarding_completed"
  | "project_created"
  | "checklist_viewed"
  | "document_created"
  | "document_downloaded"
  | "invoice_marked_sent"
  | "invoice_marked_paid"
  | "upgrade_started"
  | "upgrade_completed";

/**
 * Record an event.
 *
 * Never throws and never blocks the caller's real work: losing an analytics
 * row is a rounding error, while failing someone's invoice because a metrics
 * insert timed out is a bug they would actually feel.
 *
 * Properties must not carry document contents, client names or amounts. What
 * is worth knowing is that an invoice was created, not what was on it.
 */
export async function track(
  userId: string,
  name: EventName,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    await db.insert(events).values({
      userId,
      name,
      propsJson: properties ?? {},
    });
  } catch (error) {
    console.error(`failed to record event ${name}`, error);
  }
}

/** Has this user done something before? Used to avoid double-counting firsts. */
export async function hasEvent(
  userId: string,
  name: EventName,
): Promise<boolean> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.name, name)))
    .limit(1);

  return Boolean(row);
}
