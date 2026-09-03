import { Heading, Lead } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const checklist = [
  {
    name: "Proposal",
    status: "Essential",
    reason: "scope isn’t agreed yet",
  },
  {
    name: "SOW",
    status: "Essential",
    reason: "“branding” needs to be spelled out into exactly what’s included and what isn’t",
  },
  {
    name: "Contract",
    status: "Recommended",
    reason: "given the project value",
  },
  {
    name: "Invoice",
    status: "Essential",
    reason: "get paid for the work, on record",
  },
];

export function HowGuidanceWorks() {
  return (
    <section className="bg-surface py-16 md:py-24">
      <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <Heading>
            You don&rsquo;t need to know contract law. You need to know what&rsquo;s missing.
          </Heading>

          <p className="text-sm text-heading/70 md:text-base">
            This time, before starting, the freelancer tells Doqment the client,
            the project type (branding), and the value (₹35,000). In seconds,
            back comes a ranked checklist, each one with a one-line reason why it
            matters for this specific project. Check them off, and watch the
            completeness meter fill up. The scope-creep that ate into that
            ₹35,000 the first time around never gets a chance to happen the
            second time.
          </p>

          <Card className="border border-primary/10 bg-primary-tint">
            <p className="text-sm text-heading/80 md:text-base">
              <span className="font-semibold text-heading">
                Same logic, for the agency&rsquo;s ₹1,00,000 social media and Meta ad
                management contract:
              </span>{" "}
              the SOW that Doqment ranks as essential here comes with a specific
              reason attached: define what&rsquo;s included in the ₹1,00,000 fee and
              what isn&rsquo;t, so a line stating &ldquo;ad spend billed separately,
              reimbursed by client&rdquo; exists before the first ad ever runs.
            </p>
          </Card>

          <Lead>
            Run this on every client project, every time, and it works the same
            way whether you&rsquo;re doing it solo, running it across a small team
            where consistency is the hard part, or setting it up for the first
            time because your business hasn&rsquo;t needed formal paperwork until
            now.
          </Lead>
        </div>

        <Card className="w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-heading/50">
                Branding project
              </p>
              <p className="font-body text-lg font-semibold text-heading">₹35,000</p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs font-medium text-heading/50">Completeness</p>
              <p className="font-body text-lg font-semibold text-success">4 / 4</p>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-pill bg-surface-muted">
            <div className="h-full w-full rounded-pill bg-success" />
          </div>

          <ul className="mt-6 flex flex-col divide-y divide-heading/10">
            {checklist.map((item) => (
              <li key={item.name} className="flex items-start gap-3 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-ui text-sm font-semibold text-heading md:text-base">
                      {item.name}
                    </span>
                    <span
                      className={
                        item.status === "Essential"
                          ? "rounded-pill bg-primary-tint px-2.5 py-0.5 text-xs font-medium text-primary"
                          : "rounded-pill bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-heading/60"
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-heading/60 md:text-sm">{item.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </section>
  );
}
