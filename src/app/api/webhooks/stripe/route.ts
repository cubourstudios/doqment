import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  activateSubscription,
  claimWebhookEvent,
  downgradeSubscription,
} from "@/lib/billing/entitlement";
import { stripeClient } from "@/lib/billing/stripe";

/**
 * Stripe webhook — the only thing that grants or removes a paid plan on the
 * international rail.
 *
 * This route must stay outside auth middleware: Stripe calls it with no
 * session, and a redirect to /login would look like a delivery failure and
 * trigger endless retries.
 */

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // The raw body, read before anything parses it. Signature verification is
  // over the exact bytes Stripe sent; re-serialising parsed JSON changes them
  // and the check fails for reasons that look nothing like the cause.
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripeClient().webhooks.constructEvent(
      rawBody,
      signature ?? "",
      secret,
    );
  } catch (error) {
    // A bad signature is either a misconfiguration or a forgery. Either way it
    // is a 400: retrying will not help, and Stripe stops resending.
    console.error("stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (!(await claimWebhookEvent("stripe", event.id))) {
    // Already handled. Acknowledge so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    console.error(`stripe webhook ${event.type} failed`, error);
    // 500 asks Stripe to retry. The event id is already claimed, so the retry
    // is a no-op — deliberate: a genuine failure needs investigating, not
    // silently reapplying half-finished state.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;

      if (!userId || !session.subscription) return;

      const subscription = await stripeClient().subscriptions.retrieve(
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id,
      );

      await activateSubscription({
        userId,
        provider: "stripe",
        providerSubId: subscription.id,
        currentPeriodEnd: periodEnd(subscription),
        status: subscription.status,
        raw: {
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
        },
      });
      return;
    }

    case "invoice.paid": {
      // Renewals arrive here rather than as a new checkout, so this is what
      // keeps a long-standing subscriber's access from lapsing.
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null;
      };
      const subscriptionRef = invoice.subscription;
      if (!subscriptionRef) return;

      const subscription = await stripeClient().subscriptions.retrieve(
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef.id,
      );

      const userId = subscription.metadata?.user_id;
      if (!userId) return;

      await activateSubscription({
        userId,
        provider: "stripe",
        providerSubId: subscription.id,
        currentPeriodEnd: periodEnd(subscription),
        status: subscription.status,
        raw: {
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id,
        },
      });
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await downgradeSubscription({
        provider: "stripe",
        providerSubId: subscription.id,
        status: subscription.status,
      });
      return;
    }

    default:
      // Everything else is acknowledged and ignored. Stripe sends a great many
      // event types and reacting to ones we did not ask for invites surprises.
      return;
  }
}

/**
 * The end of the paid period.
 *
 * Stripe moved this onto subscription items; the top-level field remains on
 * older API versions, so both are checked rather than assuming either.
 */
function periodEnd(subscription: Stripe.Subscription): Date {
  const candidate =
    (subscription as unknown as { current_period_end?: number })
      .current_period_end ?? subscription.items?.data[0]?.current_period_end;

  return candidate ? new Date(candidate * 1000) : new Date();
}
