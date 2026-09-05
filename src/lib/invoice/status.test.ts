import { describe, expect, it } from "vitest";

import { invoiceStatusEnum } from "@/db/schema";
import { ALLOWED_FROM, canTransition, statusOptions } from "./status";

const ALL = invoiceStatusEnum.enumValues;

describe("invoice status transitions", () => {
  /**
   * The one rule the whole table exists for. Editing and deleting both gate on
   * `status === "draft"`, so any path back to draft re-opens a sent or paid
   * invoice to being rewritten or removed.
   */
  it("never lets an invoice return to draft", () => {
    for (const from of ALL) {
      expect(canTransition(from, "draft"), `${from} -> draft`).toBe(false);
    }
    expect(ALLOWED_FROM.draft).toEqual([]);
  });

  it("closes the paid -> draft -> edit/delete path specifically", () => {
    expect(canTransition("paid", "draft")).toBe(false);
    expect(canTransition("sent", "draft")).toBe(false);
  });

  it("keeps a mistapped paid recoverable without reaching draft", () => {
    // One tap marks an invoice paid, so undoing it has to be possible — but
    // onto a status that is still neither editable nor deletable.
    expect(canTransition("paid", "sent")).toBe(true);
    expect(canTransition("cancelled", "sent")).toBe(true);
  });

  it("allows the transitions the product actually runs on", () => {
    expect(canTransition("draft", "sent")).toBe(true);
    expect(canTransition("sent", "paid")).toBe(true);
    expect(canTransition("sent", "overdue")).toBe(true);
    expect(canTransition("overdue", "paid")).toBe(true);
    for (const from of ["draft", "sent", "overdue", "paid"] as const) {
      expect(canTransition(from, "cancelled"), `${from} -> cancelled`).toBe(true);
    }
  });

  it("never offers a transition the server would refuse", () => {
    for (const from of ALL) {
      for (const to of statusOptions(from)) {
        if (to === from) continue;
        expect(canTransition(from, to), `${from} -> ${to}`).toBe(true);
      }
    }
  });

  it("puts the current status first so the control can show it", () => {
    for (const from of ALL) {
      expect(statusOptions(from)[0]).toBe(from);
      expect(new Set(statusOptions(from)).size).toBe(statusOptions(from).length);
    }
  });

  it("covers every status as a destination", () => {
    expect(Object.keys(ALLOWED_FROM).sort()).toEqual([...ALL].sort());
  });
});
