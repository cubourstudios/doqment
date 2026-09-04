import { and, desc, eq, notInArray } from "drizzle-orm";

import { db } from "@/db";
import {
  profiles,
  subscriptions,
  webhookEvents,
  type billingProviderEnum,
} from "@/db/schema";

/**
 * Applying what a webhook says.
 *
 * Entitlement is granted here and nowhere else. A client-side success handler
 * can be replayed, tampered with, or simply not fire when someone closes the
 * tab after paying — so the provider's server-to-server call is the only thing
 * trusted to change a plan.
 */

/*
 * The enum still carries a "stripe" value that nothing writes any more.
 * Postgres cannot drop a value from an enum type — it would mean recreating
 * the type and rewriting every column that uses it — and an unused value costs
 * nothing, so it stays.
 */
type Provider = (typeof billingProviderEnum.enumValues)[number];

/** Grace past the paid period end, so a renewal in flight is not a lockout. */
const GRACE_DAYS = 3;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Record that an event was processed, returning false if it already had been.
 *
 * Razorpay retries on any non-2xx and redelivers after an outage, so the same
 * "subscription charged" can arrive several times. Without this, a retry would
 * extend the paid period again on each delivery.
 *
 * Takes the caller's transaction so the claim commits with the write it
 * guards. Claiming on a separate connection first and only then applying the
 * change leaves the event marked processed with nothing applied if that second
 * step fails — a timeout, a dropped connection — and the retry is then refused
 * as a duplicate. That is a customer who paid and stays on `free`, which
 * nothing repairs: the reconcile cron only ever downgrades.
 */
async function claimWebhookEvent(
  tx: Tx,
  provider: Provider,
  providerEventId: string,
): Promise<boolean> {
  const inserted = await tx
    .insert(webhookEvents)
    .values({ provider, providerEventId })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  return inserted.length > 0;
}

/** False when the event had already been applied. */
export async function activateSubscription(input: {
  userId: string;
  provider: Provider;
  providerSubId: string;
  currentPeriodEnd: Date;
  status: string;
  eventId: string;
  raw?: unknown;
}): Promise<boolean> {
  const {
    userId,
    provider,
    providerSubId,
    currentPeriodEnd,
    status,
    eventId,
    raw,
  } = input;

  const expiresAt = new Date(currentPeriodEnd);
  expiresAt.setDate(expiresAt.getDate() + GRACE_DAYS);

  return db.transaction(async (tx) => {
    if (!(await claimWebhookEvent(tx, provider, eventId))) return false;

    await tx
      .insert(subscriptions)
      .values({
        userId,
        provider,
        providerSubId,
        status,
        currentPeriodEnd,
        rawJson: raw ?? null,
      })
      .onConflictDoUpdate({
        target: [subscriptions.provider, subscriptions.providerSubId],
        set: {
          status,
          currentPeriodEnd,
          rawJson: raw ?? null,
          updatedAt: new Date(),
        },
      });

    await tx
      .update(profiles)
      .set({ plan: "pro", planExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));

    return true;
  });
}

/**
 * Downgrade a user.
 *
 * The subscription row is kept rather than deleted: it is the record of what
 * was charged, and someone who resubscribes should not look like a new
 * customer.
 */
export async function downgradeSubscription(input: {
  provider: Provider;
  providerSubId: string;
  status: string;
  eventId: string;
}): Promise<boolean> {
  const { provider, providerSubId, status, eventId } = input;

  return db.transaction(async (tx) => {
    if (!(await claimWebhookEvent(tx, provider, eventId))) return false;

    const [row] = await tx
      .update(subscriptions)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(subscriptions.provider, provider),
          eq(subscriptions.providerSubId, providerSubId),
        ),
      )
      .returning({ userId: subscriptions.userId });

    if (!row) return true;

    await tx
      .update(profiles)
      .set({ plan: "free", planExpiresAt: null, updatedAt: new Date() })
      .where(eq(profiles.userId, row.userId));

    return true;
  });
}

/** Map a provider subscription back to a user, for events lacking metadata. */
export async function userIdForSubscription(
  provider: Provider,
  providerSubId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, provider),
        eq(subscriptions.providerSubId, providerSubId),
      ),
    )
    .limit(1);

  return row?.userId ?? null;
}

/**
 * Statuses a subscription does not come back from. Razorpay's own vocabulary,
 * stored raw.
 */
const TERMINAL_STATUSES = ["cancelled", "completed", "expired"];

/**
 * The subscription a user currently holds, or null.
 *
 * Rows accumulate: `subscriptions` is unique on (provider, provider_sub_id),
 * so cancelling and resubscribing leaves the old row in place beside the new
 * one. Without the status filter and the ordering this returned whichever row
 * Postgres happened to hand back first, which decides both the renewal date
 * shown and — through cancelSubscription — which subscription is cancelled at
 * the provider. Cancelling a dead one reports success while the live one keeps
 * charging the card.
 */
export async function activeSubscriptionFor(userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        notInArray(subscriptions.status, TERMINAL_STATUSES),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return row ?? null;
}
