import { notFound } from "next/navigation";

import { InvoiceForm } from "@/app/(app)/projects/[id]/documents/new/invoice-form";
import { TemplateForm } from "@/app/(app)/projects/[id]/documents/new/template-form";
import { buildPrefill, type RenderContext } from "@/lib/templates/render";
import type { TemplateSchema } from "@/lib/templates/types";

import { previewAction } from "../preview-action";

/**
 * Form harness. Development only — 404s in production.
 *
 * The forms are the highest-traffic surfaces in the product and normally sit
 * behind auth, a project and a database. This renders them against fixtures so
 * the layout can be looked at rather than reasoned about.
 */
export default function FormPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const context: RenderContext = {
    profile: {
      businessName: "Riya Design Co",
      name: "Riya Sharma",
      addressJson: { lines: ["12 MG Road", "Bengaluru 560001"] },
      taxId: "29ABCDE1234F1Z5",
      country: "IN",
    },
    client: {
      name: "Kaleidoscope Brand Consultants",
      company: "Kaleidoscope",
      addressJson: { lines: ["4 Nariman Point", "Mumbai 400021"] },
      country: "IN",
      taxId: "27ZYXWV9876G1A2",
    },
    project: {
      title: "Website redesign",
      startDate: "2026-09-01",
      endDate: "2026-11-30",
    },
  };

  // A representative slice of a real template: mixed field types, a select
  // with several options, a checkbox, and help text of realistic length.
  const schema: TemplateSchema = {
    fields: [
      {
        name: "provider_name",
        label: "Your name / business name",
        type: "text",
        required: true,
        prefill: "profile.businessName",
      },
      {
        name: "provider_address",
        label: "Your address",
        type: "textarea",
        prefill: "profile.addressJson",
      },
      {
        name: "client_name",
        label: "Client name",
        type: "text",
        required: true,
        prefill: "client.name",
      },
      {
        name: "effective_date",
        label: "Effective date",
        type: "date",
        required: true,
      },
      {
        name: "mutual",
        label: "Mutual (both sides share confidential information)",
        type: "checkbox",
        default: true,
        help: "Usually yes. You will share your methods and pricing as surely as they share their plans.",
      },
      {
        name: "purpose",
        label: "Purpose of disclosure",
        type: "textarea",
        required: true,
      },
      {
        name: "term_years",
        label: "Confidentiality period (years)",
        type: "number",
        required: true,
        default: "3",
        help: "Three years is the usual term for freelance work.",
      },
      {
        name: "governing_law",
        label: "Governing law",
        type: "select",
        required: true,
        default: "in",
        options: [
          { value: "in", label: "India" },
          { value: "us", label: "United States" },
          { value: "uk", label: "United Kingdom" },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <p className="text-muted-foreground mb-8 text-xs">
        Development preview. Not reachable in production.
      </p>

      <section className="mb-16">
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">
          New invoice
        </h2>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          For Kaleidoscope Brand Consultants. Tax is worked out from where you
          and your client are based.
        </p>

        <InvoiceForm
          action={previewAction}
          context={{
            currency: "INR",
            supplierCountry: "IN",
            supplierStateCode: "29",
            clientCountry: "IN",
            clientStateCode: "27",
            registered: true,
            nextInvoiceNumber: "INV/FY2026-27/0004",
            defaultDescription: "Website redesign",
            defaultNotes: "Riya Design Co\nA/C 50100123456789\nIFSC HDFC0001234\nUPI riya@okhdfcbank",
          }}
        />
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-semibold tracking-tight">New NDA</h2>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          For Kaleidoscope Brand Consultants. Anything we already know is
          filled in — change whatever isn&apos;t right.
        </p>

        <TemplateForm
          action={previewAction}
          schema={schema}
          initialValues={buildPrefill(schema, context)}
          submitLabel="Create NDA"
          showDisclaimer
        />
      </section>
    </div>
  );
}
