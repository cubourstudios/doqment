/**
 * The Doqment mark.
 *
 * Taken from the supplied brand SVG, which is a full lockup: the mark, the
 * word "Doqment" as live `<text>` in Afacad-SemiBold, and a TM glyph. The
 * wordmark could not be used as shipped — an `<img src="…svg">` is an isolated
 * document that cannot reach the page's webfonts, so on any machine without
 * Afacad installed the text fell back to a system face and, being wider than
 * Afacad, ran past the viewBox and printed as "Doqmen" with the final letter
 * clipped.
 *
 * So the mark travels alone and the word is set in the interface font beside
 * it. That keeps the logo correct everywhere, scales with the type around it,
 * leaves the name selectable and readable by a screen reader, and costs no
 * request. If the wordmark is ever wanted as artwork, its text needs
 * converting to outlines first — see public/brand/doqment-wordmark.svg.
 */
export function DoqmentMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 69.67 69.43"
      className={className}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <polygon points="34.79 0 0 0 0 69.43 69.67 69.43 69.67 35.09 34.79 0" />
    </svg>
  );
}

/**
 * Mark plus name, as it appears in headers.
 *
 * `text-primary` on the mark rather than a baked-in #0140ff: the brand colour
 * lives in one token, and a mark that ignores it would drift the first time
 * the palette moves.
 */
export function DoqmentLogo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 font-semibold ${className ?? ""}`}>
      <DoqmentMark className="text-primary size-5 shrink-0" />
      Doqment
    </span>
  );
}
