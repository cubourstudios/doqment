import Link from "next/link";
import { Heading, Accent, Lead } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface pb-12 pt-10 md:pb-24 md:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-pale-2/40 blur-3xl md:h-96 md:w-96"
      />
      <Container className="relative flex flex-col items-center gap-6 text-center md:gap-8">
        <Heading as="h1" size="hero" align="center" className="max-w-3xl">
          We didn&rsquo;t build a smarter template library. We built the{" "}
          <Accent>checklist nobody hands you</Accent> when you start a project.
        </Heading>

        <Lead align="center" className="max-w-2xl font-semibold text-heading">
          Know what your project needs, before it costs you.
        </Lead>

        <p className="max-w-2xl text-sm text-heading/70 md:text-base">
          Whether you&rsquo;re a freelancer taking on a new client, an agency running
          several projects at once, or a small business writing your first few
          contracts without a legal team yet, Doqment tells you exactly which
          documents you need, and why, before you&rsquo;re three weeks in and
          realising you skipped one.
        </p>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/onboarding"
            className={buttonVariants({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}
          >
            Check what my project needs, free
          </Link>
          <p className="text-xs text-heading/50">
            No signup for the checklist. Takes about 30 seconds.
          </p>
        </div>
      </Container>
    </section>
  );
}
