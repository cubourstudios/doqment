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

  it("accepts a GSTIN as it was typed, case and spaces included", () => {
    // Copied out of a registration certificate a GSTIN often arrives padded or
    // lower-cased. Rejecting that teaches the user nothing they can act on.
    expect(
      onboardingSchema.safeParse({ ...base, taxId: "  29abcde1234f1z5 " })
        .success,
    ).toBe(true);
  });

  it("rejects a GSTIN of the right length whose state code is not digits", () => {
    // Length alone is not the check: the first two characters have to be a
    // state code, because that is the part the tax split reads.
    expect(
      onboardingSchema.safeParse({ ...base, taxId: "AB1CDE1234F1Z55" }).success,
    ).toBe(false);
  });

  it("blames the tax id rather than the form as a whole", () => {
    const parsed = onboardingSchema.safeParse({ ...base, taxId: "29ABC" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["taxId"]);
    }
  });
});

describe("country", () => {
  it("stores an upper-case code whatever the form sent", () => {
    // Everything downstream compares against "IN" — the tax split, the invoice
    // series, the currency. A stored "in" silently opts a user out of all of it.
    const parsed = onboardingSchema.safeParse({ ...base, country: "in" });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.country).toBe("IN");
  });

  it("checks the GSTIN of a lower-case Indian country code too", () => {
    // The GSTIN rule runs after the upper-casing. If it ever ran before, a
    // country of "in" would skip the check entirely and land an unparseable
    // GSTIN in the profile.
    expect(
      onboardingSchema.safeParse({ ...base, country: "in", taxId: "29ABC" })
        .success,
    ).toBe(false);
  });

  it("is required, since it decides what every document looks like", () => {
    expect(onboardingSchema.safeParse({ name: "Asha" }).success).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...base, country: "India" }).success,
    ).toBe(false);
  });

  it("leaves a non-Indian tax id unchecked, whatever shape it is", () => {
    // Every jurisdiction numbers differently; guessing at formats would reject
    // valid ids. Only the GSTIN is parsed, because only it is read for meaning.
    for (const taxId of ["12-3456789", "not really a tax id", "29ABC"]) {
      expect(
        onboardingSchema.safeParse({ ...base, country: "US", taxId }).success,
      ).toBe(true);
    }
  });
});
