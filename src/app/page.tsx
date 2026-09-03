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

import { Button } from "@/components/ui/button";
import { PRICING, PRO_FEATURES } from "@/lib/billing/pricing";

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
      <header className="safe-top flex h-14 items-center justify-between px-4 md:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <FileTextIcon className="size-5" />
          Doqment
        </span>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="#pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="safe-bottom flex-1 pb-12">
        <section className="mx-auto max-w-2xl px-4 pt-10 text-center md:px-8 md:pt-20">
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Know which documents you need. Then create them.
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base text-pretty md:text-lg">
            Doqment tells freelancers which contracts and invoices a project
            calls for — and why — then generates them. Built for people who have
            been burned by a handshake deal.
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
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            Free to start. No card needed.
          </p>
        </section>

        {/*
          The product, not an illustration of it. Someone deciding whether this
          is worth a signup wants to see the screen they will land on, and the
          screenshot answers "what do I actually get" faster than the copy does.
          Bleeding it off the bottom edge signals there is more below the fold
          without paying for the full height.
        */}
        <section className="mx-auto mt-14 max-w-5xl px-4 md:px-8">
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
        </section>

        <section className="mx-auto mt-16 grid max-w-4xl gap-6 px-4 sm:grid-cols-2 md:px-8">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="hover:border-foreground/20 rounded-lg border p-5 transition-colors"
            >
              <span className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{body}</p>
            </div>
          ))}
        </section>

        <section id="pricing" className="mx-auto mt-20 max-w-4xl px-4 md:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Pricing
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Start free. Upgrade when the watermark starts to matter.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Free</h3>
              <p className="mt-2">
                <span className="text-3xl font-semibold tracking-tight">₹0</span>
                <span className="text-muted-foreground ml-1 text-sm">
                  forever
                </span>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Enough to run a small practice.
              </p>
              <ul className="mt-5 grid gap-2 text-sm">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="/signup">Get started free</Link>
              </Button>
            </div>

            {/* Pro is the recommended path, so it carries the brand border. */}
            <div className="border-primary relative rounded-xl border-2 p-6">
              {saving ? (
                <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {saving}
                </span>
              ) : null}
              <h3 className="font-semibold">Pro</h3>
              <p className="mt-2">
                <span className="text-3xl font-semibold tracking-tight">
                  {monthly.amount}
                </span>
                <span className="text-muted-foreground ml-1 text-sm">
                  per month
                </span>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Or {annual.amount} a year{saving ? ` — ${saving.toLowerCase()}` : ""}.
              </p>
              <ul className="mt-5 grid gap-2 text-sm">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full">
                <Link href="/signup">Start free, upgrade later</Link>
              </Button>
            </div>
          </div>

          <p className="text-muted-foreground mt-4 text-center text-xs">
            Prices in rupees. Billed internationally in US dollars. Cancel any
            time — Pro runs to the end of the period you have paid for.
          </p>
        </section>

        <p className="text-muted-foreground mx-auto mt-16 max-w-2xl px-4 text-center text-xs md:px-8">
          Doqment generates documents from templates. It is not a law firm and
          does not provide legal advice — for anything high-stakes, have a
          lawyer review the result.
        </p>
      </main>

      <footer className="safe-bottom text-muted-foreground flex flex-wrap items-center justify-center gap-4 border-t px-4 py-6 text-sm">
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
      </footer>
    </>
  );
}
