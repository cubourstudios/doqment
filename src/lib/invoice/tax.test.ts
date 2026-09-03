import { describe, expect, it } from "vitest";

import { toDecimalString } from "./money";
import {
  computeTax,
  stateCodeFromGstin,
  taxBreakdownFromJson,
  taxBreakdownToJson,
  type TaxInput,
} from "./tax";

/** A Karnataka (29) supplier, GST registered, charging 18%. */
const base: Omit<TaxInput, "taxableAmount"> = {
  supplierCountry: "IN",
  supplierStateCode: "29",
  clientCountry: "IN",
  clientStateCode: "29",
  rateBasisPoints: 1800,
  registered: true,
};

/** ₹1,00,000.00 */
const ONE_LAKH = 10000000n;

describe("stateCodeFromGstin", () => {
  it("takes the first two digits", () => {
    expect(stateCodeFromGstin("29ABCDE1234F1Z5")).toBe("29");
  });

  it("handles Delhi's leading zero", () => {
    expect(stateCodeFromGstin("07ABCDE1234F1Z5")).toBe("07");
  });

  it("normalises case and whitespace", () => {
    expect(stateCodeFromGstin("  29abcde1234f1z5  ")).toBe("29");
  });

  it("rejects anything that is not a GSTIN", () => {
    expect(stateCodeFromGstin("29ABC")).toBeNull();
    expect(stateCodeFromGstin("ABCDE1234F1Z55")).toBeNull();
    expect(stateCodeFromGstin(null)).toBeNull();
    expect(stateCodeFromGstin("")).toBeNull();
  });
});

describe("computeTax — India, intra-state", () => {
  const result = computeTax({ ...base, taxableAmount: ONE_LAKH });

  it("splits into CGST and SGST", () => {
    expect(result.components.map((c) => c.label)).toEqual(["CGST", "SGST"]);
  });

  it("charges half the rate under each head", () => {
    for (const component of result.components) {
      expect(component.rateBasisPoints).toBe(900);
      expect(toDecimalString(component.amount)).toBe("9000.00");
    }
  });

  it("totals the full rate", () => {
    expect(toDecimalString(result.total)).toBe("18000.00");
  });
});

describe("computeTax — India, inter-state", () => {
  // Karnataka supplier, Maharashtra (27) client.
  const result = computeTax({
    ...base,
    clientStateCode: "27",
    taxableAmount: ONE_LAKH,
  });

  it("charges a single IGST line", () => {
    expect(result.components.map((c) => c.label)).toEqual(["IGST"]);
  });

  it("charges the full rate under IGST", () => {
    expect(result.components[0].rateBasisPoints).toBe(1800);
    expect(toDecimalString(result.total)).toBe("18000.00");
  });

  it("comes to the same total as the intra-state split", () => {
    const intra = computeTax({ ...base, taxableAmount: ONE_LAKH });
    expect(result.total).toBe(intra.total);
  });
});

describe("computeTax — India, export of services", () => {
  const result = computeTax({
    ...base,
    clientCountry: "US",
    clientStateCode: null,
    taxableAmount: ONE_LAKH,
  });

  it("charges nothing", () => {
    expect(result.total).toBe(0n);
    expect(result.components).toEqual([]);
  });

  it("says why on the invoice rather than silently omitting tax", () => {
    expect(result.note).toContain("Export of services");
    expect(result.note).toContain("zero rated");
  });

  it("zero-rates regardless of the client's state field", () => {
    const withState = computeTax({
      ...base,
      clientCountry: "GB",
      clientStateCode: "29",
      taxableAmount: ONE_LAKH,
    });
    expect(withState.total).toBe(0n);
  });
});

describe("computeTax — registration and rate", () => {
  it("charges nothing when the supplier is not registered", () => {
    // Below the threshold this is the correct invoice, not a degraded one.
    const result = computeTax({
      ...base,
      registered: false,
      taxableAmount: ONE_LAKH,
    });
    expect(result.total).toBe(0n);
    expect(result.components).toEqual([]);
  });

  it("charges nothing at a zero rate", () => {
    expect(
      computeTax({ ...base, rateBasisPoints: 0, taxableAmount: ONE_LAKH }).total,
    ).toBe(0n);
  });

  it("supports rates other than 18%", () => {
    const result = computeTax({
      ...base,
      rateBasisPoints: 1200,
      taxableAmount: ONE_LAKH,
    });
    expect(toDecimalString(result.total)).toBe("12000.00");
    expect(result.components[0].rateBasisPoints).toBe(600);
  });
});

describe("computeTax — unknown client state", () => {
  it("treats an unknown state as a local supply", () => {
    // The conservative reading: charging CGST+SGST locally is correctable,
    // while under-charging IGST leaves the freelancer owing the difference.
    const result = computeTax({
      ...base,
      clientStateCode: null,
      taxableAmount: ONE_LAKH,
    });
    expect(result.components.map((c) => c.label)).toEqual(["CGST", "SGST"]);
  });
});

describe("computeTax — outside India", () => {
  it("charges a single tax line at the entered rate", () => {
    const result = computeTax({
      ...base,
      supplierCountry: "GB",
      supplierStateCode: null,
      clientCountry: "GB",
      clientStateCode: null,
      rateBasisPoints: 2000,
      taxableAmount: ONE_LAKH,
    });

    expect(result.components.map((c) => c.label)).toEqual(["Tax"]);
    expect(toDecimalString(result.total)).toBe("20000.00");
  });
});

describe("computeTax — rounding", () => {
  it("rounds each half independently, as GST portals do", () => {
    // 9% of ₹333.33 = ₹29.9997 → ₹30.00 per head.
    const result = computeTax({ ...base, taxableAmount: 33333n });

    expect(toDecimalString(result.components[0].amount)).toBe("30.00");
    expect(toDecimalString(result.components[1].amount)).toBe("30.00");
    expect(toDecimalString(result.total)).toBe("60.00");
  });

  it("can differ by a paisa from a single IGST line, which is expected", () => {
    // ₹0.06: 9% is ₹0.0054, which rounds up to ₹0.01 under each of two heads,
    // while 18% is ₹0.0108, which rounds down to ₹0.01 as one. Per-component
    // rounding is what the GST portal does, so the intra-state invoice really
    // does collect one paisa more.
    const amount = 6n;

    const intra = computeTax({ ...base, taxableAmount: amount });
    const inter = computeTax({
      ...base,
      clientStateCode: "27",
      taxableAmount: amount,
    });

    expect(intra.total).toBe(2n);
    expect(inter.total).toBe(1n);
  });
});

describe("tax breakdown serialisation", () => {
  it("round-trips through JSON, preserving bigint amounts", () => {
    const original = computeTax({ ...base, taxableAmount: ONE_LAKH });
    const restored = taxBreakdownFromJson(
      JSON.parse(JSON.stringify(taxBreakdownToJson(original, "INR"))),
      "INR",
    );

    expect(restored.total).toBe(original.total);
    expect(restored.components).toEqual(original.components);
  });

  it("serialises amounts as strings, since JSON has no bigint", () => {
    const json = taxBreakdownToJson(computeTax({ ...base, taxableAmount: ONE_LAKH }), "INR");
    expect(typeof json.total).toBe("string");
    expect(() => JSON.stringify(json)).not.toThrow();
  });
});
