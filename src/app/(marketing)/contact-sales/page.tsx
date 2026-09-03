import { Heading, Lead } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

// Contact Sales form per docs/content-strategy.md §5 — fields only, no
// submit handler yet. Wired to a real lead-capture flow in a later phase.
export default function ContactSalesPage() {
  return (
    <Container className="flex flex-col items-center gap-8 py-12 md:py-20">
      <div className="max-w-xl text-center">
        <Heading align="center">Let&rsquo;s find pricing that fits your volume</Heading>
        <Lead align="center" className="mt-3">
          Running a large number of client accounts or need documents in
          bulk? Tell us a bit about it and someone from the team will get
          back to you within 24 to 48 hours.
        </Lead>
      </div>

      <form className="flex w-full max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-heading">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="min-h-[44px] rounded-sm border border-heading/20 px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-heading">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="min-h-[44px] rounded-sm border border-heading/20 px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company" className="text-sm font-medium text-heading">
            Company name
          </label>
          <input
            id="company"
            name="company"
            type="text"
            className="min-h-[44px] rounded-sm border border-heading/20 px-3 text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="documents" className="text-sm font-medium text-heading">
            Which documents are needed?
          </label>
          <input
            id="documents"
            name="documents"
            type="text"
            placeholder="e.g. Proposal, SOW, Invoice"
            className="min-h-[44px] rounded-sm border border-heading/20 px-3 text-base placeholder:text-heading/40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="volume" className="text-sm font-medium text-heading">
            Roughly how many in total?
          </label>
          <input
            id="volume"
            name="volume"
            type="text"
            className="min-h-[44px] rounded-sm border border-heading/20 px-3 text-base"
          />
        </div>

        <Button type="submit" variant="primary" className="mt-2 w-full">
          Send to sales
        </Button>
      </form>
    </Container>
  );
}
