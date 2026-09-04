import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PRICING, priceFor, type BillingRail } from "./pricing";

/**
 * The display string and the amount actually charged must agree.
 *
 * They lived apart until recently, and the gap was not theoretical: the app
 * advertised ₹299 while the live plan charged ₹199, and nothing in the code,
 * the tests or the UI could tell. The only place it showed was a customer's
 * card statement.
 */
describe("pricing", () => {
  const rails: BillingRail[] = ["inr", "usd"];

  /** "₹2,990" -> 299000 minor units. */
  function minorFromDisplay(display: string): number {
    const digits = display.replace(/[^0-9.]/g, "");
    return Math.round(Number(digits) * 100);
  }

  for (const rail of rails) {
    describe(rail, () => {
      const pricing = PRICING[rail];

      it("displays the amount it charges", () => {
        for (const option of [pricing.monthly, pricing.annual]) {
          expect(minorFromDisplay(option.amount)).toBe(option.amountMinor);
        }
      });

      /*
       * Two months free is the whole argument for the annual plan — it is what
       * makes it the obvious choice and roughly doubles realised lifetime
       * value. A repricing that moves the monthly rate and forgets the annual
       * one silently discounts more or less than intended.
       */
      it("prices the year at ten months", () => {
        expect(pricing.annual.amountMinor).toBe(
          pricing.monthly.amountMinor * 10,
        );
      });

      it("advertises the saving against the real monthly cost", () => {
        expect(minorFromDisplay(pricing.annual.comparedTo ?? "")).toBe(
          pricing.monthly.amountMinor * 12,
        );
      });

      it("charges something", () => {
        expect(pricing.monthly.amountMinor).toBeGreaterThan(0);
      });
    });
  }

  it("picks the option matching the interval", () => {
    expect(priceFor("inr", "year")).toBe(PRICING.inr.annual);
    expect(priceFor("inr", "month")).toBe(PRICING.inr.monthly);
  });

  /*
   * scripts/check-razorpay.mjs carries its own copy of these numbers, because
   * it is plain JavaScript and cannot import this module. A duplicate that
   * drifts is worse than no checker at all — it would confidently approve a
   * plan priced to the old figures — so the copy is pinned here.
   */
  it("keeps the razorpay checker's expectations in step", () => {
    const script = readFileSync("scripts/check-razorpay.mjs", "utf8");

    const entries = [...script.matchAll(/\{ envKey: "([A-Z_]+)".*?amountMinor: ([0-9_]+).*?\}/g)];
    expect(entries.length).toBe(4);

    const expectations = new Map(
      entries.map((match) => [match[1], Number(match[2].replace(/_/g, ""))]),
    );

    for (const rail of rails) {
      for (const option of [PRICING[rail].monthly, PRICING[rail].annual]) {
        expect(expectations.get(option.envKey)).toBe(option.amountMinor);
      }
    }
  });
});
