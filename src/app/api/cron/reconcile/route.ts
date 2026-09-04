import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";

/**
 * Daily reconciliation.
 *
 * Webhooks get missed — an outage on either side, a deploy mid-delivery, a
 * signature secret rotated at the wrong moment. Without this, a cancelled
 * subscription whose webhook never arrived would leave someone on Pro
 * indefinitely, and there would be nothing to notice it.
 *
 * The check is deliberately narrow: anyone marked `pro` whose grace period has
 * already elapsed is downgraded. `plan_expires_at` is only ever extended by a
 * successful payment webhook, so a lapsed one means no payment was recorded.
 * That is safe in the direction that matters — a paying customer whose webhook
 * arrives late is restored on the next delivery, and getUserPlan() already
 * treats a lapsed expiry as free, so this only makes the stored state agree
 * with what the app is already enforcing.
 */

export async function GET(request: Request) {
  // Vercel signs cron requests with this header. Refuse when the secret is
  // absent rather than skipping the check: an unset CRON_SECRET is how this
  // endpoint becomes a public plan-downgrade trigger, so it fails closed.
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("CRON_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const downgraded = await db
    .update(profiles)
    .set({ plan: "free", planExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(profiles.plan, "pro"), lt(profiles.planExpiresAt, new Date())))
    .returning({ userId: profiles.userId });

  if (downgraded.length > 0) {
    // Worth a log line: a spike here means webhooks are not arriving, which is
    // a billing outage rather than routine housekeeping.
    console.warn(
      `reconcile: downgraded ${downgraded.length} lapsed pro profile(s)`,
    );
  }

  return NextResponse.json({ downgraded: downgraded.length });
}
