import { describe, expect, it } from "vitest";

import { onboardingSchema } from "./onboarding";

const base = { name: "Asha", country: "IN" };

describe("taxId", () => {
  /**
   * The first two digits of a GSTIN are the supplier's state code, and that
   * decides IGST versus CGST+SGST. A GSTIN that does not parse yields no state
   * code, which reads as a local supply and taxes an out-of-state invoice
   * under a head the client cannot claim.
   */
  it("rejects a malformed GSTIN for an Indian profile", () => {
    for (const taxId of ["29ABC", "not-a-gstin", "ABCDE1234F1Z55"]) {
      const parsed = onboardingSchema.safeParse({ ...base, taxId });
      expect(parsed.success).toBe(false);
    }
  });

  it("accepts a well-formed GSTIN", () => {
    expect(
      onboardingSchema.safeParse({ ...base, taxId: "29ABCDE1234F1Z5" }).success,
    ).toBe(true);
  });

  it("leaves other countries' tax ids alone", () => {
    expect(
      onboardingSchema.safeParse({
        ...base,
        country: "GB",
        taxId: "GB123456789",
      }).success,
    ).toBe(true);
  });

  it("stays optional — onboarding must not require it", () => {
    expect(onboardingSchema.safeParse({ ...base, taxId: "" }).success).toBe(true);
    expect(onboardingSchema.safeParse(base).success).toBe(true);
  });
});
