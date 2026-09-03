import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { ShieldCheck, Receipt, Lightbulb } from "lucide-react";

// Icon-benefit cards per docs/design-system.md §7.1 — static, no hover reveal.
const signals = [
  {
    icon: ShieldCheck,
    title: "Lawyer reviewed",
    body: "Every template is reviewed and approved by our lawyer before it ever reaches you.",
  },
  {
    icon: Receipt,
    title: "GST compliant",
    body: "GST compliant invoicing for India, standard compliant invoicing for the US.",
  },
  {
    icon: Lightbulb,
    title: "Reasoning shown",
    body: "A system that explains why each document matters, not just that it exists.",
  },
];

export function WhyTrust() {
  return (
    <section className="bg-surface py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Heading align="center">
            Built for freelancers first. Growing with agencies and small teams.
          </Heading>
          <p className="mt-4 text-sm text-heading/70 md:text-base">
            Doqment started with a simple, specific problem: freelancers taking
            on client work without knowing what paperwork they&rsquo;d need until it
            was too late. That same blind spot shows up in small agencies and
            early-stage businesses, just at a slightly different scale, so the
            same guidance engine works for all three.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3 md:mt-16">
          {signals.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-tint text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <p className="font-ui text-sm font-semibold text-heading md:text-base">
                {title}
              </p>
              <p className="text-xs text-heading/60 md:text-sm">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
