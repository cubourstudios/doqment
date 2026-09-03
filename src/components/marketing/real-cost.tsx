import { Heading, Lead } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

const scenarios = [
  {
    label: "Freelancer",
    body: "A freelancer takes on a ₹35,000 logo design and branding project. No Proposal, no SOW, just a verbal understanding of “the branding.” A few weeks in, the client keeps adding: a few extra logo variations, then brand guidelines, then social media templates, all “part of branding, right?” There was nothing written down to say otherwise, so the freelancer ends up doing significantly more work, inside the same ₹35,000, because there was never a document defining where the project actually ended.",
  },
  {
    label: "Agency",
    body: "An agency takes on social media management and Meta ad management for a client, a ₹1,00,000 contract. The understanding was that ad spend sits outside that ₹1,00,000, the client pays Meta directly or reimburses it separately. That was never written into anything the client signed. When the ad spend bill came due, the client pointed back to the ₹1,00,000 and said it should already be covered. Nothing on paper said otherwise, so the agency ended up paying the ad spend out of its own pocket to keep the campaigns running.",
  },
  {
    label: "Small business",
    body: "The first few clients happened over email, because there was no one around yet to say “we should probably get this in writing.” It works fine until the first dispute, when there’s nothing on paper to point to and no time to figure out what should have existed from day one.",
  },
];

export function RealCost() {
  return (
    <section className="bg-surface-muted py-16 md:py-24">
      <Container>
        <div className="mx-auto max-w-2xl">
          <Heading align="center">
            It&rsquo;s never the client. It&rsquo;s the paperwork nobody thought to write down.
          </Heading>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:mt-16 md:grid-cols-3 md:gap-6">
          {scenarios.map((s) => (
            <Card key={s.label} className="flex flex-col gap-4">
              <Chip>{s.label}</Chip>
              <p className="text-sm text-heading/70 md:text-base">{s.body}</p>
            </Card>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-md bg-surface p-6 shadow-card md:mt-16 md:p-8">
          <Lead align="center">
            None of this happens because anyone did something wrong. It happens
            because nobody told them what to have ready before they needed it. A
            Proposal and an SOW would have settled, in writing, exactly what
            &ldquo;branding&rdquo; meant on that ₹35,000 project, before the extra work
            started. The same goes for the agency&rsquo;s ₹1,00,000 contract, one line
            in an SOW stating ad spend is billed separately would have settled it
            before a single rupee came out of anyone&rsquo;s own pocket. So what
            actually decides which documents a project needs? That&rsquo;s the part
            every template site skips.
          </Lead>
        </div>
      </Container>
    </section>
  );
}
