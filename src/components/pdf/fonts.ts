"use client";

import { Font } from "@react-pdf/renderer";

/**
 * Font registration for PDF rendering. Must run before any PDF is rendered.
 *
 * This is not decoration. @react-pdf/renderer defaults to Helvetica, which has
 * no glyph for "₹" — an Indian freelancer's invoice would print every rupee
 * amount with a blank box where the currency symbol should be. That is the
 * single most visible way this product could embarrass its primary user.
 *
 * Two *static* files, one per weight. This used to be a single variable font
 * registered for both weights, and the cost was not cosmetic: react-pdf
 * resolved weight 700 out of the variable file and built a broken glyph
 * subset, so bold runs silently lost characters. A service agreement printed
 * its heading as "ervice Agreement" and its clauses as ". ervices" and
 * "2. ees and payment" — a contract with letters missing, sent to a client.
 *
 * Static instances are what react-pdf handles correctly, so each weight now
 * points at its own file. Keep it that way: pointing both weights at one
 * variable file brings the dropped glyphs straight back.
 *
 * The download is one-time and client-side; the generated PDF embeds only the
 * glyphs actually used.
 */

let registered = false;

export function registerPdfFonts() {
  if (registered) return;

  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: "/fonts/NotoSans-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/NotoSans-Bold.ttf", fontWeight: 700 },
    ],
  });

  // react-pdf hyphenates aggressively by default, which looks wrong in a
  // business document — "Devel-opment" in a line item is not a good look.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
