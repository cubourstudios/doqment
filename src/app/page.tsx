import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  FileTextIcon,
  ReceiptIndianRupeeIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICING, PRO_FEATURES } from "@/lib/billing/pricing";
import { DoqmentMark } from "@/components/brand/logo";

/**
 * Public landing page.
 *
 * Layout notes, because they are the part most easily undone:
 *
 * - One shared gutter (`SHELL`) runs from the header to the footer, so the
 *   logo, the hero, the cards and the footer links all sit on the same two
 *   vertical lines at every width. Sections that differ only in max-width read
 *   as sloppy at a glance even when nobody can say why.
 * - Vertical rhythm lives on the sections (`py-…`), not on ad-hoc `mt-` values
 *   sprinkled through the children. Adding a section should not require
 *   re-guessing the spacing above it.
 * - Above `lg` the content spreads to four feature columns and a three-column
 *   pricing band rather than staying a narrow centred strip on a wide monitor.
 *   Reading passages still cap at a comfortable measure — that is a typography
 *   limit, not a layout one.
 */
const SHELL = "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12";

/**
 * A link that is a target in its own right (header, footer) rather than a word
 * inside a sentence: 44px tall, its own focus ring, its own hover surface.
 */
const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-md px-3 text-base underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

const VALUE_PROPS = [
  {
    icon: CheckCircle2Icon,
    title: "Know what you need",
    body: "Describe the project. Get a checklist of the documents it actually needs — each with one line on why it matters, and what goes wrong without it.",
  },
  {
    icon: FileTextIcon,
    title: "Generate them in minutes",
    body: "Proposals, service agreements, SOWs and NDAs from guided forms that fill themselves in from details you've already given.",
  },
  {
    icon: ReceiptIndianRupeeIcon,
    title: "Invoices that hold up",
    body: "GST-compliant tax invoices for India, standard invoices elsewhere. Numbered sequentially, with no gaps and no duplicates.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Everything in one place",
    body: "Documents stay filed under the project, searchable by client, downloadable whenever your accountant asks.",
  },
];

const FREE_FEATURES = [
  "3 projects",
  "5 documents a month",
  "Every invoice feature",
  "Your own files, 5 MB each",
];

export default function LandingPage() {
  // Prices come from the billing module rather than being retyped here: a
  // landing page quoting a price the checkout does not charge is the worst
  // kind of stale copy.
  const { monthly, annual } = PRICING.inr;
  // `saving` is optional on a PriceOption — a rail could price its annual plan
  // flat — so the badge and the sentence both fall back to the plain figure.
  const saving = annual.saving;

  return (
    <>
      {/* Sticky so the only two actions on the page stay reachable during a
          long scroll; translucent so the screenshot below it does not appear
          to end abruptly at a hard white band. */}
      <header className="bg-background/80 safe-top sticky top-0 z-40 border-b backdrop-blur">
        <div className={`${SHELL} flex h-16 items-center justify-between gap-3`}>
          <Link
            href="/"
            className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-lg font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <DoqmentMark className="text-primary size-5 shrink-0" />
            Doqment
          </Link>

          <nav className="-mr-3 flex items-center gap-2">
            <Link href="#pricing" className={`${NAV_LINK} text-muted-foreground`}>
              Pricing
            </Link>
            <Link href="/login" className={`${NAV_LINK} text-muted-foreground`}>
              Sign in
            </Link>
            {/* The primary action is already full-width in the hero on a
                phone, so repeating it in a cramped header buys nothing. */}
            <Button asChild className="ml-1 hidden text-base sm:inline-flex">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="safe-bottom flex-1">
        <section className={`${SHELL} pt-12 pb-16 md:pt-20 md:pb-24`}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-primary text-base font-medium">
              For freelancers
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Know which documents you need. Then create them.
            </h1>
            {/* max-w-xl, not the container width: at text-lg this lands near a
                65-character measure, which is where long lines stop costing
                the reader a re-read. */}
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg text-pretty">
              Doqment tells freelancers which contracts and invoices a project
              calls for — and why — then generates them. Built for people who
              have been burned by a handshake deal.
            </p>

            {/* Full-width on mobile: the primary action should be a thumb-sized
                target at the bottom of the fold, not a small centred pill. */}
            <div className="mt-8 grid gap-3 sm:flex sm:justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">
                  Get started free
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-base">
              Free to start. No card needed.
            </p>
          </div>

          {/*
            The product, not an illustration of it. Someone deciding whether
            this is worth a signup wants to see the screen they will land on,
            and the screenshot answers "what do I actually get" faster than the
            copy does. Fading the bottom edge signals there is more below
            without paying for the full height.
          */}
          <div className="mx-auto mt-14 max-w-6xl md:mt-20">
            <div className="ring-border/70 relative overflow-hidden rounded-xl shadow-2xl ring-1">
              <Image
                src="/screenshots/dashboard.png"
                alt="The Doqment dashboard: outstanding, overdue and paid totals above a six-month chart of invoiced against received."
                width={1280}
                height={700}
                // Above the fold on a laptop, so it is not lazy-loaded.
                priority
                className="w-full"
              />
              <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent" />
            </div>
          </div>
        </section>

        <section className="bg-muted/40 border-y py-16 md:py-24">
          <div className={SHELL}>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              What Doqment does
            </h2>

            {/* Four columns at lg: on a wide monitor this is the difference
                between using the screen and leaving two thirds of it blank. */}
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
              {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="bg-background hover:border-primary/40 flex h-full flex-col rounded-xl border p-6 transition-colors"
                >
                  <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-lg">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-base">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 py-16 md:py-24">
          <div className={`${SHELL} grid gap-10 lg:grid-cols-3 lg:gap-8`}>
            {/* The heading takes a column of its own at lg rather than sitting
                centred above two cards adrift in white space. */}
            <div className="lg:pt-2">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Pricing
              </h2>
              <p className="text-muted-foreground mt-4 max-w-md text-base">
                Start free. Upgrade when the watermark starts to matter.
              </p>
              <p className="text-muted-foreground mt-6 max-w-md text-base">
                Prices in rupees. Billed internationally in US dollars. Cancel
                any time — Pro runs to the end of the period you have paid for.
              </p>
            </div>

            {/* The plans pair up from md — at 768 two stacked full-width cards
                are mostly empty — and the pair then takes the two remaining
                columns of the lg band. */}
            <div className="grid gap-8 md:grid-cols-2 md:gap-6 lg:col-span-2 lg:gap-8">
              {/* flex-col so the two call-to-action buttons sit on one line
                  across both cards however unevenly the feature lists wrap. */}
              <div className="flex flex-col rounded-xl border p-6 md:p-8">
                <h3 className="text-lg font-semibold tracking-tight">Free</h3>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">
                    ₹0
                  </span>
                  <span className="text-muted-foreground text-base">
                    forever
                  </span>
                </p>
                <p className="text-muted-foreground mt-2 text-base">
                  Enough to run a small practice.
                </p>
                <ul className="mt-6 grid gap-3 text-base">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon className="text-muted-foreground mt-1 size-4 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {/* mt-auto, not a margin on the button: the two cards' feature
                    lists are different lengths, and the buttons should still
                    land on the same line. */}
                <div className="mt-auto pt-8">
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <Link href="/signup">Get started free</Link>
                  </Button>
                </div>
              </div>

              {/* Pro is the recommended path, so it carries the brand border. */}
              <div className="border-primary ring-primary/10 relative flex flex-col rounded-xl border-2 p-6 ring-4 md:p-8">
                {saving ? (
                  /* text-base rather than the Badge default: this is the only
                     number on the page that moves a buying decision, and 12px
                     is below this app's floor for anything meant to be read. */
                  <Badge className="absolute -top-3.5 left-6 px-3 py-1 text-base">
                    {saving}
                  </Badge>
                ) : null}
                <h3 className="text-lg font-semibold tracking-tight">Pro</h3>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">
                    {monthly.amount}
                  </span>
                  <span className="text-muted-foreground text-base">
                    per month
                  </span>
                </p>
                <p className="text-muted-foreground mt-2 text-base">
                  Or {annual.amount} a year
                  {saving ? ` — ${saving.toLowerCase()}` : ""}.
                </p>
                <ul className="mt-6 grid gap-3 text-base">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon className="text-primary mt-1 size-4 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Button asChild size="lg" className="w-full">
                    <Link href="/signup">Start free, upgrade later</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t py-12 md:py-16">
          <p className="text-muted-foreground mx-auto max-w-2xl px-5 text-center text-base text-pretty sm:px-8">
            Doqment generates documents from templates. It is not a law firm and
            does not provide legal advice — for anything high-stakes, have a
            lawyer review the result.
          </p>
        </section>
      </main>

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
            <Link href="/login" className={NAV_LINK}>
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
