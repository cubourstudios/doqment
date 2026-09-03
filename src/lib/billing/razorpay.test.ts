import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  verifyCheckoutSignature,
  verifyRazorpaySignature,
} from "./razorpay";

const SECRET = "test_secret_do_not_use";

function sign(payload: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("verifyCheckoutSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  const paymentId = "pay_ABC123";
  const subscriptionId = "sub_XYZ789";

  it("accepts a signature over payment_id|subscription_id", () => {
    expect(
      verifyCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`),
      }),
    ).toBe(true);
  });

  /*
   * The order of the two ids differs between Razorpay's subscription and order
   * flows, and swapping them is the mistake that produces a signature which
   * looks plausible and never matches. Pinned so a future edit cannot quietly
   * adopt the order form's ordering.
   */
  it("rejects the order-flow ordering", () => {
    expect(
      verifyCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${subscriptionId}|${paymentId}`),
      }),
    ).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    expect(
      verifyCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`, "wrong_secret"),
      }),
    ).toBe(false);
  });

  it("rejects a signature for a different payment", () => {
    expect(
      verifyCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: sign(`pay_SOMEONE_ELSE|${subscriptionId}`),
      }),
    ).toBe(false);
  });

  // Length mismatch is checked before timingSafeEqual, which throws on one.
  it("rejects a truncated signature without throwing", () => {
    expect(
      verifyCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: sign(`${paymentId}|${subscriptionId}`).slice(0, 20),
      }),
    ).toBe(false);
  });

  it("refuses to run without a secret rather than passing", () => {
    delete process.env.RAZORPAY_KEY_SECRET;

    expect(() =>
      verifyCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: "anything",
      }),
    ).toThrow(/RAZORPAY_KEY_SECRET/);
  });
});

describe("verifyRazorpaySignature", () => {
  const body = '{"event":"subscription.charged"}';

  it("accepts an HMAC over the exact raw body", () => {
    expect(verifyRazorpaySignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a body that was re-serialised", () => {
    const reserialised = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyRazorpaySignature(reserialised, sign(body), SECRET)).toBe(
      false,
    );
  });

  it("rejects a missing signature header", () => {
    expect(verifyRazorpaySignature(body, null, SECRET)).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    expect(verifyRazorpaySignature(body, "abc", SECRET)).toBe(false);
  });
});
