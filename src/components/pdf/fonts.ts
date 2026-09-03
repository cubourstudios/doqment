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
 * The bundled file is Noto Sans as a *variable* font, registered for both
 * weights. Static instances would be preferable — @react-pdf/renderer resolves
 * a variable font to its default instance, so bold text may render at regular
 * weight — but static Noto Sans TTFs were not reachable from the build
 * environment, and a cosmetic weight difference is a far smaller problem than
 * a missing currency symbol. Swapping in NotoSans-Regular.ttf and
 * NotoSans-Bold.ttf here is a drop-in improvement whenever they are to hand.
 *
 * The 2 MB download is one-time and client-side; the generated PDF embeds only
 * the glyphs actually used.
 */

let registered = false;

export function registerPdfFonts() {
  if (registered) return;

  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: "/fonts/NotoSans-Variable.ttf", fontWeight: 400 },
      { src: "/fonts/NotoSans-Variable.ttf", fontWeight: 700 },
    ],
  });

  // react-pdf hyphenates aggressively by default, which looks wrong in a
  // business document — "Devel-opment" in a line item is not a good look.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
