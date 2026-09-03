import Link from "next/link";

import { DoqmentMark } from "@/components/brand/logo";

const SHELL = "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-md px-3 text-base underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Shell for the legal pages.
 *
 * They used to carry a single 14px "← Doqment" link and nothing else, so
 * arriving on the privacy policy from a search result left no obvious way into
 * the product. Same header and footer as the landing page, on the same gutter,
 * so the two do not read as different sites.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="bg-background/80 safe-top sticky top-0 z-40 border-b backdrop-blur">
        <div className={`${SHELL} flex h-16 items-center justify-between gap-3`}>
          <Link
            href="/"
            className="focus-visible:ring-ring/50 -ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-lg font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <DoqmentMark className="text-primary size-5 shrink-0" />
            Doqment
          </Link>

          <nav className="text-muted-foreground -mr-3 flex items-center gap-2">
            <Link href="/login" className={NAV_LINK}>
              Sign in
            </Link>
            <Link
              href="/signup"
              className={`${NAV_LINK} text-primary font-medium`}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="safe-bottom flex-1">{children}</main>

      <footer className="bg-muted/40 border-t">
        <div
          className={`${SHELL} safe-bottom flex flex-col items-center gap-4 py-8 sm:flex-row sm:justify-between`}
        >
          <span className="text-muted-foreground flex items-center gap-2 text-base">
            <DoqmentMark className="text-primary size-4 shrink-0" />
            Doqment
          </span>
          <nav className="text-muted-foreground -mx-3 flex flex-wrap items-center justify-center gap-2">
            <Link href="/terms" className={NAV_LINK}>
              Terms
            </Link>
            <Link href="/privacy" className={NAV_LINK}>
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
