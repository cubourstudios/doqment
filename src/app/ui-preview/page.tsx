import { notFound } from "next/navigation";

import { DocumentChecklist } from "@/components/app/document-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProjectChecklist } from "@/lib/guidance/service";
import { formatDecimal } from "@/lib/invoice/money";

/**
 * A visual harness for screens that normally need auth and a database.
 *
 * Development only — it 404s in production. Its purpose is to let the actual
 * rendered UI be looked at and screenshotted while iterating on design, rather
 * than reasoning about layout from source. Fixtures below are representative
 * rather than pretty: a long client name and a mixed checklist are exactly the
 * cases that break a layout.
 */
export default function UiPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const checklist: ProjectChecklist = {
    items: [
      {
        docType: "proposal",
        priority: "essential",
        rationale:
          "Sets out what you will deliver and for how much, before you start. Without it, scope arguments have no reference point.",
      },
      {
        docType: "service_agreement",
        priority: "essential",
        rationale:
          "The contract itself: payment terms, ownership of the work, and what happens if either side walks away.",
      },
      {
        docType: "sow",
        priority: "essential",
        rationale:
          "Pins down deliverables and dates in detail, so 'one more small change' has a clear answer.",
      },
      {
        docType: "invoice",
        priority: "essential",
        rationale:
          "A GST-compliant tax invoice. Your client's accounts team will not pay without one.",
      },
      {
        docType: "nda",
        priority: "recommended",
        rationale:
          "A new client sharing business plans usually expects one, and it protects your methods too.",
      },
      {
        docType: "payment_reminder",
        priority: "situational",
        rationale: "Ready if the invoice goes past its due date.",
      },
    ],
    generated: new Set(["proposal"]),
    completeness: { done: 1, total: 4, percent: 25 },
    input: {
      projectType: "design",
      valueBand: "50k_2l",
      clientCountry: "IN",
      clientRelationship: "new",
    },
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="text-muted-foreground mb-8 text-xs">
        Development preview. Not reachable in production.
      </p>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Dashboard stats</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="px-4">
              <p className="text-muted-foreground text-sm">Outstanding</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                ₹2,36,000.00
              </p>
              <p className="text-muted-foreground mt-1 text-xs">2 invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4">
              <p className="text-muted-foreground text-sm">Overdue</p>
              <p className="text-destructive mt-1 text-xl font-semibold tabular-nums">
                ₹1,18,000.00
              </p>
              <p className="text-muted-foreground mt-1 text-xs">1 invoice</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-4">
              <p className="text-muted-foreground text-sm">Paid</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                ₹4,72,000.00
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Received to date
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Project checklist</h2>
        <DocumentChecklist projectId="preview" checklist={checklist} />
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">List rows</h2>
        <ul className="grid gap-2">
          {[
            ["INV/FY2026-27/0001", "Kaleidoscope Brand Consultants", "paid"],
            ["INV/FY2026-27/0002", "Acme Pvt Ltd", "overdue"],
            ["INV/FY2026-27/0003", "Northwind Trading Company", "sent"],
          ].map(([number, client, status]) => (
            <li key={number}>
              <div className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{number}</span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {client}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-medium tabular-nums">
                    {formatDecimal("118000.00", "INR")}
                  </span>
                  <Badge
                    variant={
                      status === "paid"
                        ? "success"
                        : status === "overdue"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {status}
                  </Badge>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Usage meter</h2>
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span>Projects</span>
                <span className="text-muted-foreground tabular-nums">
                  3 of 3
                </span>
              </div>
              <Progress value={100} />
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span>Documents</span>
                <span className="text-muted-foreground tabular-nums">
                  4 of 5
                </span>
              </div>
              <Progress value={80} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>
    </div>
  );
}
