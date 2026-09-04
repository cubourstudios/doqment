import type { ReactNode } from "react";

export type LegalSection = {
  /** Doubles as the anchor id, so the contents list can link to it. */
  id: string;
  title: string;
  body: ReactNode;
};

/**
 * Shared layout for the terms and the privacy policy.
 *
 * Two things it fixes. The prose column stays near a 65-character measure —
 * legal text is the last place a reader should be losing their line — but the
 * page no longer wastes a wide monitor on empty margins: from `xl` the space
 * to the left becomes a sticky contents list, which is also the fastest way to
 * answer the question people actually arrive with ("what do you do with my
 * data?") without reading the whole thing.
 *
 * Every section is a real `<section>` with a heading and an id, so those links
 * work, the browser's find-in-page lands somewhere sensible, and a screen
 * reader can jump by heading.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 md:py-16 lg:px-12">
      <div className="grid gap-12 xl:grid-cols-[16rem_minmax(0,42rem)] xl:justify-center xl:gap-16">
        {/* Hidden below xl rather than collapsed into an accordion: on a phone
            the list would push the document itself off the first screen, and
            these pages are short enough to scroll. */}
        <nav
          aria-label="On this page"
          className="hidden xl:sticky xl:top-28 xl:block xl:self-start"
        >
          <p className="text-muted-foreground text-base font-medium">
            On this page
          </p>
          {/* gap-2, not gap-1: 8px is the floor for space between two adjacent
              tap targets, and these are stacked full-width. */}
          <ul className="-mx-3 mt-2 grid gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 flex min-h-11 items-center rounded-md px-3 text-base transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article>
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3 text-base">
            Last updated {updated}
          </p>

          <div className="mt-10 grid gap-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <div className="text-muted-foreground mt-3 grid gap-4 text-base leading-relaxed">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
