import Link from "next/link";
import { Heading, Lead } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export function Pricing() {
  return (
    <section className="bg-surface-muted py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl">
          <Heading align="center">Pay for what you generate. Nothing more.</Heading>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:mt-16 md:grid-cols-2">
          <Card className="flex flex-col gap-6">
            <div>
              <p className="font-body text-lg font-semibold text-heading">
                Pay per document
              </p>
              <p className="mt-1 text-sm text-heading/60">
                No subscription. No plan you don&rsquo;t need.
              </p>
            </div>

            <ul className="flex flex-col gap-3 text-sm md:text-base">
              <li className="flex items-center justify-between border-b border-heading/10 pb-3">
                <span className="text-heading/80">Proposal, Contract, SOW</span>
                <span className="font-semibold text-heading">from ₹19</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-heading/80">Invoice</span>
                <span className="font-semibold text-heading">from ₹4</span>
              </li>
            </ul>

            <Lead className="!text-sm">
              That&rsquo;s less than the cost of a cup of chai to protect a project
              worth thousands. And because it&rsquo;s pay-per-document, an agency
              running a handful of projects a month simply pays for what it
              generates, never for seats or a tier it doesn&rsquo;t need.
            </Lead>
          </Card>

          <Card className="flex flex-col gap-6 bg-navy-deep text-white">
            <div>
              <p className="font-body text-lg font-semibold">
                Running documents in volume?
              </p>
              <p className="mt-1 text-sm text-white/60">
                For agencies and small businesses generating at scale
              </p>
            </div>

            <p className="text-sm text-white/70 md:text-base">
              Running a large number of client accounts or need documents in
              bulk? The same per-document pricing applies as standard, but past
              a certain volume, it&rsquo;s worth talking to us directly so we can
              work out pricing that actually fits how much you&rsquo;re generating.
            </p>

            <Link
              href="/contact-sales"
              className={buttonVariants({ variant: "inverted", size: "default", className: "mt-auto self-start" })}
            >
              Contact Sales
            </Link>
            <p className="text-xs text-white/50">
              Someone from the team will get back to you within 24 to 48 hours.
            </p>
          </Card>
        </div>
      </Container>
    </section>
  );
}
