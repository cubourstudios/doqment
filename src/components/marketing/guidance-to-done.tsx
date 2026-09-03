import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";

// Full-bleed dark rhythm break per docs/design-system.md §1/§11 — used
// deliberately, once every few sections, to reset visual pace.
export function GuidanceToDone() {
  return (
    <section className="bg-navy-deep py-16 text-white md:py-24">
      <Container className="mx-auto max-w-3xl text-center">
        <span className="mb-4 inline-flex rounded-pill bg-white px-4 py-1.5 text-xs font-medium text-heading">
          Reviewed &amp; approved by our lawyer
        </span>

        <Heading invert align="center">
          Once you know what you need, get it done without leaving the page.
        </Heading>

        <div className="mt-6 flex flex-col gap-4 text-sm text-white/70 md:text-base">
          <p>
            Generate the actual document, pre-filled from your project details.
            GST compliant for India, standard compliant for the US. Invoices get
            automatic numbering and status tracking, so you always know what&rsquo;s
            a draft, what&rsquo;s been sent, what&rsquo;s paid, and what&rsquo;s overdue.
          </p>
          <p>
            A quick, honest note: this isn&rsquo;t legal advice, Doqment helps you
            generate the right documents and explains why they matter. But every
            document template behind it has been reviewed and approved by our
            lawyer before it ever reaches you, so what you&rsquo;re generating isn&rsquo;t
            a guess dressed up as a contract, it&rsquo;s a properly vetted document
            filled in with your project&rsquo;s details.
          </p>
          <p>
            Everything lives under the project it belongs to, so a growing
            agency or a small business scaling past its first few clients isn&rsquo;t
            stuck digging through email threads when something needs to be found
            six months later.
          </p>
        </div>
      </Container>
    </section>
  );
}
