import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * The registration itself is the thing worth testing here.
 *
 * Pointing both weights at one *variable* file is what made react-pdf build a
 * broken glyph subset for bold runs: a service agreement printed "ervice
 * Agreement" and "2. ees and payment" — a contract missing letters, sent to a
 * client. Nothing in a rendered PDF is easy to assert on, but the invariant
 * that caused it is: two weights, two distinct files, both present on disk.
 */
describe("PDF font registration", () => {
  it("registers each weight from its own file", async () => {
    const registered: { src: string; fontWeight: number }[] = [];

    vi.doMock("@react-pdf/renderer", () => ({
      Font: {
        register: (arg: { fonts: { src: string; fontWeight: number }[] }) =>
          registered.push(...arg.fonts),
        registerHyphenationCallback: () => {},
      },
    }));

    const { registerPdfFonts } = await import("./fonts");
    registerPdfFonts();

    const weights = registered.map((f) => f.fontWeight);
    expect(weights).toContain(400);
    expect(weights).toContain(700);

    const regular = registered.find((f) => f.fontWeight === 400)!.src;
    const bold = registered.find((f) => f.fontWeight === 700)!.src;

    // The bug: these were the same variable font.
    expect(regular).not.toBe(bold);
    expect(regular).not.toMatch(/variable/i);
    expect(bold).not.toMatch(/variable/i);

    // Registered as browser paths under /public; both must actually ship.
    for (const src of [regular, bold]) {
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
  });
});
