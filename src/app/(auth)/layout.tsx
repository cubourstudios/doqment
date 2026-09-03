import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { DoqmentMark } from "@/components/brand/logo";

/**
 * What the reader gets, restated from the landing page in one line each. This
 * panel is a reminder of the thing they were about to sign up for, not a new
 * pitch — anything claimed here has to be claimed there too.
 */
const REMINDERS = [
  "A checklist of the documents a project actually needs",
  "Proposals, agreements, SOWs and NDAs from guided forms",
  "GST-compliant invoices, numbered without gaps",
];

/**
 * Auth shell.
 *
 * Single column up to `lg`: these forms have four fields at most, and a
 * two-column split on a phone would only push the inputs below the fold.
 *
 * From `lg` the form keeps its comfortable width and the space that would
 * otherwise sit empty on either side becomes a context panel, so a 1440px
 * window shows a designed page rather than a small card marooned in white.
 * The panel is deliberately not a heading level — the form's own <h1> is the
 * page's heading, and a second one above it would misdescribe the page.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2 xl:grid-cols-[1fr_1.1fr]">
      <aside className="bg-muted/40 safe-top hidden border-r px-12 py-16 lg:flex lg:flex-col lg:justify-center xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="focus-visible:ring-ring/50 -mx-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-lg font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <DoqmentMark className="text-primary size-5 shrink-0" />
            Doqment
          </Link>

          <p className="mt-10 text-3xl font-semibold tracking-tight text-balance">
            Know which documents you need. Then create them.
          </p>

          <ul className="text-muted-foreground mt-8 grid gap-4 text-base">
            {REMINDERS.map((reminder) => (
              <li key={reminder} className="flex items-start gap-3">
                <CheckIcon className="text-primary mt-1 size-4 shrink-0" />
                {reminder}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="safe-top safe-bottom flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          {/* The wordmark repeats on the form side only where the panel is
              hidden; showing both at once would print the logo twice. */}
          <Link
            href="/"
            className="focus-visible:ring-ring/50 mx-auto mb-8 flex min-h-11 w-fit items-center gap-2 rounded-md px-2 text-lg font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:outline-none lg:hidden"
          >
            <DoqmentMark className="text-primary size-5 shrink-0" />
            Doqment
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
