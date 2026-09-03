import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

const faqs = [
  {
    q: "What if my country isn’t India or the US?",
    a: "It’s in the pipeline. Drop us your requirement and we’ll look at building support for it, we believe in building around what our customers actually need, not just what’s easiest for us to ship first.",
  },
  {
    q: "What happens after Proposal, Contract, SOW, and Invoice?",
    a: "Coming soon: NDA and payment reminders are next up.",
  },
  {
    q: "Are these documents legally binding, or checked by anyone qualified?",
    a: "Every template is reviewed and approved by our lawyer before it’s made available. Doqment itself isn’t giving legal advice, it’s handing you a properly vetted document filled in with your project details.",
  },
  {
    q: "Can an agency use this across multiple client accounts?",
    a: "Yes, standard per-document pricing applies the same way it does for a solo freelancer. If you’re generating documents in real volume across many accounts, reach out through Contact Sales and someone from the team will respond within 24 to 48 hours with pricing that fits your actual usage.",
  },
  {
    q: "I’m just starting my business, is this overkill for me?",
    a: "Start with just the documents you need for your very first client. There’s no plan to commit to and nothing to set up in advance, Doqment scales with you as your business grows, not the other way around.",
  },
  {
    q: "Is my project data stored safely, and can I delete it if I want to?",
    a: "Yes. Everything is encrypted and private, no one but you can access your documents. You can delete any document whenever you want, and if you’d rather not think about it at all, there’s an optional disposable documents feature that automatically deletes documents for you after a set time.",
  },
];

export function FAQ() {
  return (
    <section className="bg-surface py-16 md:py-24">
      <Container className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div>
          <Heading>Frequently asked questions</Heading>
        </div>
        <Accordion>
          {faqs.map((item, i) => (
            <AccordionItem key={item.q} question={item.q} defaultOpen={i === 0}>
              {item.a}
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
