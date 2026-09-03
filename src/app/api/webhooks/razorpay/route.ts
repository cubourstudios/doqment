import { NextResponse } from "next/server";

import {
  activateSubscription,
  claimWebhookEvent,
  downgradeSubscription,
  userIdForSubscription,
} from "@/lib/billing/entitlement";
import { verifyRazorpaySignature } from "@/lib/billing/razorpay";

/**
 * Razorpay webhook — the only thing that grants or removes a paid plan on the
 * India rail.
 *
 * The client-side checkout handler is deliberately not trusted for
 * entitlement. It can be replayed, edited in a console, or never fire at all
 * when someone closes the tab immediately after paying.
 *
 * Must stay outside auth middleware: Razorpay calls with no session.
 */

type RazorpayPayload = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
  };
};

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // Raw bytes, before any parsing: the HMAC is over exactly what was sent.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpaySignature(rawBody, signature, secret)) {
    console.error("razorpay webhook signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: RazorpayPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const entity = payload.payload?.subscription?.entity;
  const eventName = payload.event;

  if (!eventName || !entity?.id) {
    return NextResponse.json({ received: true, ignored: true });
  }

  /*
   * Razorpay does not send a stable event id, so one is derived from the
   * subscription, the event name and the period end. That combination changes
   * on every real state transition and repeats on every retry — which is
   * exactly the property idempotency needs.
   */
  const eventId = `${entity.id}:${eventName}:${entity.current_end ?? 0}`;

  if (!(await claimWebhookEvent("razorpay", eventId))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(eventName, entity);
  } catch (error) {
    console.error(`razorpay webhook ${eventName} failed`, error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(
  eventName: string,
  entity: NonNullable<
    NonNullable<RazorpayPayload["payload"]>["subscription"]
  >["entity"],
) {
  if (!entity?.id) return;

  const subscriptionId = entity.id;
  const status = entity.status ?? "unknown";

  switch (eventName) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.resumed": {
      // notes.user_id is set when the subscription is created and is the only
      // field that survives the round trip. Falling back to a lookup covers
      // events for subscriptions created before that was true.
      const userId =
        entity.notes?.user_id ??
        (await userIdForSubscription("razorpay", subscriptionId));

      if (!userId) {
        console.error(`razorpay: no user for subscription ${subscriptionId}`);
        return;
      }

      await activateSubscription({
        userId,
        provider: "razorpay",
        providerSubId: subscriptionId,
        // current_end is seconds. Without it there is no period to grant, so
        // a month from now is the safe assumption rather than immediate expiry.
        currentPeriodEnd: entity.current_end
          ? new Date(entity.current_end * 1000)
          : monthFromNow(),
        status,
      });
      return;
    }

    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.expired": {
      await downgradeSubscription({
        provider: "razorpay",
        providerSubId: subscriptionId,
        status,
      });
      return;
    }

    default:
      return;
  }
}

function monthFromNow(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}
