/**
 * The six base document types, in three regional flavours (IN / US / INTL).
 *
 * IMPORTANT — these are drafted from public references and are NOT legal
 * advice. They are deliberately plain-language and conservative. Before the
 * contract types go in front of paying users they need a lawyer's read
 * (Tech Plan, open question 1); the invoice types are the safest to ship first
 * because their content is dictated by tax rules rather than by drafting
 * judgement.
 *
 * Structure: `schema` drives the guided form, `body` is the rendered document
 * with `{{merge_tags}}` resolved from the form values plus profile/client/
 * project context.
 */
import type { DocType, Region } from "@/lib/guidance/types";
import type { TemplateBody, TemplateField, TemplateSchema } from "@/lib/templates/types";

export type SeedTemplate = {
  docType: DocType;
  region: Region;
  version: number;
  name: string;
  schema: TemplateSchema;
  body: TemplateBody;
};

// -- Reusable field groups ---------------------------------------------------

const PARTY_FIELDS: TemplateField[] = [
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
    name: "client_address",
    label: "Client address",
    type: "textarea",
    prefill: "client.addressJson",
  },
];

const EFFECTIVE_DATE: TemplateField = {
  name: "effective_date",
  label: "Effective date",
  type: "date",
  required: true,
};

const GOVERNING_LAW: Record<Region, TemplateField> = {
  IN: {
    name: "governing_law",
    label: "Governing law and jurisdiction",
    type: "text",
    required: true,
    help: "Usually the city where you are based, e.g. \"the courts of Bengaluru, India\".",
  },
  US: {
    name: "governing_law",
    label: "Governing law",
    type: "text",
    required: true,
    help: "Usually your home state, e.g. \"the State of Texas\".",
  },
  INTL: {
    name: "governing_law",
    label: "Governing law",
    type: "text",
    required: true,
    help: "The country whose law applies. Agree this with the client before signing.",
  },
};

// -- Invoice: the one genuinely region-specific type -------------------------

const INVOICE_COMMON: TemplateField[] = [
  ...PARTY_FIELDS,
  { name: "issue_date", label: "Issue date", type: "date", required: true },
  {
    name: "due_date",
    label: "Due date",
    type: "date",
    help: "Net 15 or Net 30 from the issue date is the usual freelance term.",
  },
  {
    name: "line_items",
    label: "Line items",
    type: "line_items",
    required: true,
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

const INVOICE_FIELDS: Record<Region, TemplateField[]> = {
  IN: [
    ...INVOICE_COMMON,
    {
      name: "provider_gstin",
      label: "Your GSTIN",
      type: "text",
      prefill: "profile.taxId",
      help: "Leave blank if you are not GST-registered — the invoice then omits the tax breakdown.",
    },
    { name: "client_gstin", label: "Client GSTIN", type: "text", prefill: "client.taxId" },
    {
      name: "place_of_supply",
      label: "Place of supply (state)",
      type: "text",
      required: true,
      help: "Decides the split: same state as you means CGST + SGST, a different state means IGST.",
    },
    {
      name: "hsn_sac",
      label: "HSN / SAC code",
      type: "text",
      help: "Service accounting code for what you are billing. 998314 covers most IT and design services.",
    },
  ],
  US: [
    ...INVOICE_COMMON,
    { name: "provider_tax_id", label: "Your EIN / SSN (optional)", type: "text", prefill: "profile.taxId" },
    {
      name: "sales_tax_rate",
      label: "Sales tax rate (%)",
      type: "number",
      help: "Most freelance services are not subject to sales tax. Leave at 0 unless you know otherwise.",
    },
  ],
  INTL: [
    ...INVOICE_COMMON,
    { name: "provider_vat_id", label: "Your VAT ID", type: "text", prefill: "profile.taxId" },
    { name: "client_vat_id", label: "Client VAT ID", type: "text", prefill: "client.taxId" },
    {
      name: "reverse_charge",
      label: "Reverse charge applies",
      type: "checkbox",
      help: "Cross-border B2B services within the EU usually shift the VAT obligation to the client.",
    },
  ],
};

const INVOICE_BODY: Record<Region, TemplateBody> = {
  IN: {
    blocks: [
      { id: "title", text: "TAX INVOICE" },
      {
        id: "parties",
        text: "{{provider_name}}\n{{provider_address}}\nGSTIN: {{provider_gstin}}\n\nBill to:\n{{client_name}}\n{{client_address}}\nGSTIN: {{client_gstin}}",
      },
      {
        id: "meta",
        text: "Invoice no: {{invoice_number}}\nIssue date: {{issue_date}}\nDue date: {{due_date}}\nPlace of supply: {{place_of_supply}}\nHSN/SAC: {{hsn_sac}}",
      },
      { id: "items", text: "{{line_items}}" },
      { id: "totals", text: "{{tax_breakdown}}\nTotal: {{total}}" },
      { id: "notes", text: "{{notes}}" },
    ],
  },
  US: {
    blocks: [
      { id: "title", text: "INVOICE" },
      {
        id: "parties",
        text: "{{provider_name}}\n{{provider_address}}\n\nBill to:\n{{client_name}}\n{{client_address}}",
      },
      {
        id: "meta",
        text: "Invoice no: {{invoice_number}}\nIssue date: {{issue_date}}\nDue date: {{due_date}}",
      },
      { id: "items", text: "{{line_items}}" },
      { id: "totals", text: "{{tax_breakdown}}\nTotal due: {{total}}" },
      { id: "notes", text: "{{notes}}" },
    ],
  },
  INTL: {
    blocks: [
      { id: "title", text: "INVOICE" },
      {
        id: "parties",
        text: "{{provider_name}}\n{{provider_address}}\nVAT ID: {{provider_vat_id}}\n\nBill to:\n{{client_name}}\n{{client_address}}\nVAT ID: {{client_vat_id}}",
      },
      {
        id: "meta",
        text: "Invoice no: {{invoice_number}}\nIssue date: {{issue_date}}\nDue date: {{due_date}}",
      },
      { id: "items", text: "{{line_items}}" },
      { id: "totals", text: "{{tax_breakdown}}\nTotal due: {{total}}" },
      {
        id: "reverse_charge",
        text: "{{#reverse_charge}}VAT reverse charge: VAT to be accounted for by the recipient.{{/reverse_charge}}",
      },
      { id: "notes", text: "{{notes}}" },
    ],
  },
};

// -- The five document types whose content barely varies by region -----------

function proposal(region: Region): SeedTemplate {
  return {
    docType: "proposal",
    region,
    version: 1,
    name: "Project Proposal",
    schema: {
      fields: [
        ...PARTY_FIELDS,
        { name: "project_title", label: "Project title", type: "text", required: true, prefill: "project.title" },
        { name: "summary", label: "What you understand the client needs", type: "textarea", required: true },
        { name: "approach", label: "How you will approach it", type: "textarea", required: true },
        { name: "deliverables", label: "What the client receives", type: "textarea", required: true },
        { name: "timeline", label: "Timeline", type: "textarea" },
        { name: "fee", label: "Fee", type: "currency", required: true },
        {
          name: "payment_terms",
          label: "Payment terms",
          type: "textarea",
          help: "An upfront percentage is the single most effective protection against non-payment.",
        },
        { name: "valid_until", label: "Proposal valid until", type: "date" },
      ],
    },
    body: {
      blocks: [
        { id: "title", text: "PROPOSAL — {{project_title}}" },
        { id: "for", text: "Prepared for {{client_name}} by {{provider_name}}" },
        { id: "summary", heading: "Understanding", text: "{{summary}}" },
        { id: "approach", heading: "Approach", text: "{{approach}}" },
        { id: "deliverables", heading: "Deliverables", text: "{{deliverables}}" },
        { id: "timeline", heading: "Timeline", text: "{{timeline}}" },
        { id: "fee", heading: "Fee", text: "{{fee}}\n\n{{payment_terms}}" },
        { id: "validity", text: "{{#valid_until}}This proposal is valid until {{valid_until}}.{{/valid_until}}" },
      ],
    },
  };
}

function serviceAgreement(region: Region): SeedTemplate {
  return {
    docType: "service_agreement",
    region,
    version: 1,
    name: "Service Agreement",
    schema: {
      fields: [
        ...PARTY_FIELDS,
        EFFECTIVE_DATE,
        { name: "services", label: "Services you will provide", type: "textarea", required: true },
        { name: "fee", label: "Fee", type: "currency", required: true },
        { name: "payment_terms", label: "Payment terms", type: "textarea", required: true },
        {
          name: "late_fee",
          label: "Late payment interest (% per month)",
          type: "number",
          help: "Stating a rate up front makes chasing late payment a matter of policy rather than confrontation.",
        },
        {
          name: "ip_transfer",
          label: "Client owns the work on full payment",
          type: "checkbox",
          help: "Tying the IP transfer to payment is the strongest leverage a freelancer has.",
          // Ticked, for the reason types.ts sets out beside `default`: help text
          // recommending something beside an unticked box is the product
          // declining to take its own advice. Left off, the shipped service
          // agreement said nothing at all about who owns the work.
          default: true,
        },
        { name: "termination_notice", label: "Notice period for termination (days)", type: "number" },
        GOVERNING_LAW[region],
      ],
    },
    body: {
      blocks: [
        { id: "title", text: "SERVICE AGREEMENT" },
        {
          id: "parties",
          text: "This agreement is made on {{effective_date}} between {{provider_name}} (\"the Service Provider\") and {{client_name}} (\"the Client\").",
        },
        { id: "services", heading: "1. Services", text: "The Service Provider will provide the following services: {{services}}" },
        { id: "fees", heading: "2. Fees and payment", text: "The Client will pay {{fee}}. {{payment_terms}}{{#late_fee}} Overdue amounts carry interest at {{late_fee}}% per month.{{/late_fee}}" },
        {
          id: "ip",
          heading: "3. Intellectual property",
          text: "{{#ip_transfer}}All rights in the delivered work transfer to the Client upon receipt of payment in full. Until then, the Service Provider retains all rights.{{/ip_transfer}}",
        },
        { id: "confidentiality", heading: "4. Confidentiality", text: "Each party will keep the other's non-public information confidential and use it only for this engagement." },
        { id: "termination", heading: "5. Termination", text: "{{#termination_notice}}Either party may terminate this agreement on {{termination_notice}} days' written notice. {{/termination_notice}}The Client remains liable for work completed up to the termination date." },
        { id: "liability", heading: "6. Limitation of liability", text: "Neither party is liable for indirect or consequential loss. The Service Provider's total liability is limited to the fees paid under this agreement." },
        { id: "law", heading: "7. Governing law", text: "This agreement is governed by {{governing_law}}." },
        { id: "signatures", text: "Signed for the Service Provider: ______________________\n\nSigned for the Client: ______________________" },
      ],
    },
  };
}

function sow(region: Region): SeedTemplate {
  return {
    docType: "sow",
    region,
    version: 1,
    name: "Statement of Work",
    schema: {
      fields: [
        ...PARTY_FIELDS,
        { name: "project_title", label: "Project title", type: "text", required: true, prefill: "project.title" },
        EFFECTIVE_DATE,
        { name: "scope", label: "In scope", type: "textarea", required: true },
        {
          name: "out_of_scope",
          label: "Explicitly out of scope",
          type: "textarea",
          help: "The most valuable box on this form. Naming what you are not doing is what prevents scope creep.",
        },
        { name: "deliverables", label: "Deliverables", type: "textarea", required: true },
        { name: "milestones", label: "Milestones and dates", type: "textarea" },
        { name: "revisions", label: "Revision rounds included", type: "number", required: true },
        { name: "client_responsibilities", label: "What you need from the client", type: "textarea" },
        { name: "change_process", label: "How changes are handled", type: "textarea" },
      ],
    },
    body: {
      blocks: [
        { id: "title", text: "STATEMENT OF WORK — {{project_title}}" },
        { id: "parties", text: "Between {{provider_name}} and {{client_name}}, effective {{effective_date}}." },
        { id: "scope", heading: "1. Scope", text: "{{scope}}" },
        { id: "out", heading: "2. Out of scope", text: "The following are not included and would be quoted separately: {{out_of_scope}}" },
        { id: "deliverables", heading: "3. Deliverables", text: "{{deliverables}}" },
        { id: "milestones", heading: "4. Milestones", text: "{{milestones}}" },
        { id: "revisions", heading: "5. Revisions", text: "This engagement includes {{revisions}} round(s) of revisions. Further rounds are charged separately." },
        { id: "client", heading: "6. Client responsibilities", text: "{{client_responsibilities}}" },
        { id: "changes", heading: "7. Changes", text: "{{change_process}}" },
      ],
    },
  };
}

function nda(region: Region): SeedTemplate {
  return {
    docType: "nda",
    region,
    version: 1,
    name: "Non-Disclosure Agreement",
    schema: {
      fields: [
        ...PARTY_FIELDS,
        EFFECTIVE_DATE,
        {
          name: "mutual",
          label: "Mutual (both sides share confidential information)",
          type: "checkbox",
          // The help says "usually yes", so the default says yes too. Advising
          // one thing and defaulting to the other is the product hedging.
          default: true,
          help: "Usually yes. You will share your methods and pricing as surely as they share their plans.",
        },
        { name: "purpose", label: "Purpose of disclosure", type: "textarea", required: true },
        { name: "term_years", label: "Confidentiality period (years)", type: "number", required: true, default: "3", help: "Three years is the usual term for freelance work. Five or more is unusual outside deep technical secrets." },
        GOVERNING_LAW[region],
      ],
    },
    body: {
      blocks: [
        { id: "title", text: "NON-DISCLOSURE AGREEMENT" },
        { id: "parties", text: "This agreement is made on {{effective_date}} between {{provider_name}} and {{client_name}}." },
        { id: "purpose", heading: "1. Purpose", text: "The parties wish to exchange confidential information for the following purpose: {{purpose}}" },
        { id: "definition", heading: "2. Confidential information", text: "Confidential information means non-public information disclosed by one party to the other, in any form, that is marked confidential or would reasonably be understood to be confidential." },
        { id: "obligations", heading: "3. Obligations", text: "The receiving party will keep the confidential information secret, use it only for the purpose above, and disclose it only to people who need it and are under equivalent obligations." },
        { id: "exclusions", heading: "4. Exclusions", text: "These obligations do not apply to information that is or becomes public through no fault of the receiving party, was already known to it, is independently developed, or must be disclosed by law." },
        { id: "term", heading: "5. Term", text: "These obligations continue for {{term_years}} year(s) from the date of disclosure." },
        { id: "law", heading: "6. Governing law", text: "This agreement is governed by {{governing_law}}." },
        { id: "signatures", text: "Signed: ______________________     Signed: ______________________" },
      ],
    },
  };
}

function paymentReminder(region: Region): SeedTemplate {
  return {
    docType: "payment_reminder",
    region,
    version: 1,
    name: "Payment Reminder",
    schema: {
      fields: [
        { name: "client_name", label: "Client name", type: "text", required: true, prefill: "client.name" },
        // The reminder signs off with the sender's name, so the form has to
        // ask for it. Without this field the sign-off renders as a gap.
        { name: "provider_name", label: "Your name / business name", type: "text", required: true, prefill: "profile.businessName" },
        { name: "invoice_number", label: "Invoice number", type: "text", required: true },
        { name: "invoice_date", label: "Invoice date", type: "date", required: true },
        { name: "due_date", label: "Was due on", type: "date", required: true },
        { name: "amount", label: "Amount outstanding", type: "currency", required: true },
        {
          name: "tone",
          label: "Tone",
          type: "select",
          required: true,
          options: [
            { value: "friendly", label: "Friendly nudge (a few days late)" },
            { value: "firm", label: "Firm (two weeks or more late)" },
            { value: "final", label: "Final notice (before escalation)" },
          ],
          help: "Escalate one step at a time. Jumping straight to a final notice costs you the client.",
        },
        { name: "payment_details", label: "How to pay", type: "textarea" },
      ],
    },
    body: {
      blocks: [
        { id: "subject", text: "Subject: Invoice {{invoice_number}} — payment reminder" },
        { id: "greeting", text: "Hi {{client_name}}," },
        {
          id: "body",
          text: "{{#friendly}}Just a quick note that invoice {{invoice_number}} for {{amount}}, issued on {{invoice_date}}, was due on {{due_date}}. It may well have slipped through — could you let me know when I can expect it?{{/friendly}}{{#firm}}Invoice {{invoice_number}} for {{amount}} was due on {{due_date}} and remains unpaid. Please arrange payment within the next five working days, or let me know if there is a problem I should know about.{{/firm}}{{#final}}Invoice {{invoice_number}} for {{amount}} was due on {{due_date}} and is now significantly overdue. Unless payment is received within seven days, I will have to pause work and pursue recovery under our agreement.{{/final}}",
        },
        { id: "how", text: "{{payment_details}}" },
        { id: "signoff", text: "Thanks,\n{{provider_name}}" },
      ],
    },
  };
}

function invoice(region: Region): SeedTemplate {
  return {
    docType: "invoice",
    region,
    version: 1,
    name: region === "IN" ? "Tax Invoice (GST)" : "Invoice",
    schema: { fields: INVOICE_FIELDS[region] },
    body: INVOICE_BODY[region],
  };
}

const REGIONS: Region[] = ["IN", "US", "INTL"];

export const templatesSeed: SeedTemplate[] = REGIONS.flatMap((region) => [
  proposal(region),
  serviceAgreement(region),
  sow(region),
  nda(region),
  invoice(region),
  paymentReminder(region),
]);
