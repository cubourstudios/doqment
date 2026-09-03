import { and, eq } from "drizzle-orm";

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

/**
 * Record that an event was processed, returning false if it already had been.
 *
 * Razorpay retries on any non-2xx and redelivers after an outage, so the same
 * "subscription charged" can arrive several times. Without this, a retry would
 * extend the paid period again on each delivery.
 */
export async function claimWebhookEvent(
  provider: Provider,
  providerEventId: string,
): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, providerEventId })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  return inserted.length > 0;
}

export async function activateSubscription(input: {
  userId: string;
  provider: Provider;
  providerSubId: string;
  currentPeriodEnd: Date;
  status: string;
  raw?: unknown;
}): Promise<void> {
  const { userId, provider, providerSubId, currentPeriodEnd, status, raw } =
    input;

  const expiresAt = new Date(currentPeriodEnd);
  expiresAt.setDate(expiresAt.getDate() + GRACE_DAYS);

  await db.transaction(async (tx) => {
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
}): Promise<void> {
  const { provider, providerSubId, status } = input;

  await db.transaction(async (tx) => {
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

    if (!row) return;

    await tx
      .update(profiles)
      .set({ plan: "free", planExpiresAt: null, updatedAt: new Date() })
      .where(eq(profiles.userId, row.userId));
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

export async function activeSubscriptionFor(userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return row ?? null;
}
