import { describe, expect, it } from "vitest";

import { templatesSeed } from "@/db/seed-data/templates";
import {
  buildPrefill,
  missingRequired,
  readPath,
  renderBody,
  resolveTags,
  type RenderContext,
} from "./render";

const context: RenderContext = {
  profile: {
    businessName: "Riya Design Co",
    name: "Riya Sharma",
    addressJson: { lines: ["12 MG Road", "Bengaluru 560001"] },
    taxId: "29ABCDE1234F1Z5",
    country: "IN",
  },
  client: {
    name: "Acme Pvt Ltd",
    company: "Acme",
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

describe("readPath", () => {
  it("reads a nested value", () => {
    expect(readPath("profile.businessName", context)).toBe("Riya Design Co");
  });

  it("flattens an address into lines", () => {
    expect(readPath("profile.addressJson", context)).toBe(
      "12 MG Road\nBengaluru 560001",
    );
  });

  it("returns empty for a missing path rather than throwing", () => {
    expect(readPath("profile.nope", context)).toBe("");
    expect(readPath("nothing.at.all", context)).toBe("");
  });

  it("returns empty when the client is absent", () => {
    expect(readPath("client.name", { ...context, client: null })).toBe("");
  });
});

describe("buildPrefill", () => {
  it("fills fields from their prefill path", () => {
    const values = buildPrefill(
      {
        fields: [
          {
            name: "provider_name",
            label: "You",
            type: "text",
            prefill: "profile.businessName",
          },
        ],
      },
      context,
    );

    expect(values.provider_name).toBe("Riya Design Co");
  });

  it("leaves fields without a prefill empty", () => {
    const values = buildPrefill(
      { fields: [{ name: "scope", label: "Scope", type: "textarea" }] },
      context,
    );

    expect(values.scope).toBe("");
  });

  it("starts checkboxes unticked when no default is given", () => {
    const values = buildPrefill(
      { fields: [{ name: "mutual", label: "Mutual", type: "checkbox" }] },
      context,
    );

    expect(values.mutual).toBe(false);
  });

  it("ticks a checkbox whose template says it should default on", () => {
    // Advising "usually yes" while defaulting to no is the product hedging.
    const values = buildPrefill(
      {
        fields: [
          { name: "mutual", label: "Mutual", type: "checkbox", default: true },
        ],
      },
      context,
    );

    expect(values.mutual).toBe(true);
  });

  it("uses a template default when there is nothing to prefill from", () => {
    const values = buildPrefill(
      {
        fields: [
          { name: "term_years", label: "Years", type: "number", default: "3" },
        ],
      },
      context,
    );

    expect(values.term_years).toBe("3");
  });

  it("prefers real context over a template default", () => {
    // A default is a starting point for the unknown, not a replacement for
    // something the user has already told us.
    const values = buildPrefill(
      {
        fields: [
          {
            name: "client_name",
            label: "Client",
            type: "text",
            prefill: "client.name",
            default: "The Client",
          },
        ],
      },
      context,
    );

    expect(values.client_name).toBe("Acme Pvt Ltd");
  });

  it("falls back to the default when the context value is missing", () => {
    const values = buildPrefill(
      {
        fields: [
          {
            name: "client_name",
            label: "Client",
            type: "text",
            prefill: "client.name",
            default: "The Client",
          },
        ],
      },
      { ...context, client: null },
    );

    expect(values.client_name).toBe("The Client");
  });
});

describe("resolveTags", () => {
  it("substitutes a form value", () => {
    expect(resolveTags("Hello {{name}}", { name: "Riya" }, context)).toBe(
      "Hello Riya",
    );
  });

  it("tolerates whitespace inside the braces", () => {
    expect(resolveTags("Hello {{ name }}", { name: "Riya" }, context)).toBe(
      "Hello Riya",
    );
  });

  it("falls back to context for a dotted tag", () => {
    expect(resolveTags("From {{profile.businessName}}", {}, context)).toBe(
      "From Riya Design Co",
    );
  });

  it("prefers a form value over context", () => {
    // The user corrected a pre-filled field; their answer must win.
    expect(
      resolveTags(
        "{{provider_name}}",
        { provider_name: "Riya Design LLP" },
        context,
      ),
    ).toBe("Riya Design LLP");
  });

  it("renders a checkbox as words rather than 'true'", () => {
    expect(resolveTags("Mutual: {{mutual}}", { mutual: true }, context)).toBe(
      "Mutual: Yes",
    );
    expect(resolveTags("Mutual: {{mutual}}", { mutual: false }, context)).toBe(
      "Mutual: No",
    );
  });

  it("leaves a gap rather than literal braces for an unknown tag", () => {
    // Braces in a delivered contract look like a broken product; a gap at
    // least reads as something the author left blank.
    expect(resolveTags("Payable by {{nope}}.", {}, context)).toBe("Payable by .");
  });

  it("replaces every occurrence, not just the first", () => {
    expect(resolveTags("{{a}} and {{a}}", { a: "x" }, context)).toBe("x and x");
  });

  it("leaves text with no tags untouched", () => {
    expect(resolveTags("Plain text.", {}, context)).toBe("Plain text.");
  });
});

describe("conditional sections", () => {
  it("keeps a section whose checkbox is ticked", () => {
    expect(
      resolveTags("{{#ip_transfer}}Rights transfer.{{/ip_transfer}}", {
        ip_transfer: true,
      }, context),
    ).toBe("Rights transfer.");
  });

  it("drops a section whose checkbox is unticked", () => {
    expect(
      resolveTags("{{#ip_transfer}}Rights transfer.{{/ip_transfer}}", {
        ip_transfer: false,
      }, context),
    ).toBe("");
  });

  it("selects the matching branch of a select-driven set", () => {
    // One "tone" field drives three mutually exclusive sections.
    const text =
      "{{#friendly}}Just a nudge.{{/friendly}}{{#firm}}This is overdue.{{/firm}}{{#final}}Final notice.{{/final}}";

    expect(resolveTags(text, { tone: "firm" }, context)).toBe(
      "This is overdue.",
    );
    expect(resolveTags(text, { tone: "friendly" }, context)).toBe(
      "Just a nudge.",
    );
  });

  it("resolves tags inside a kept section", () => {
    expect(
      resolveTags(
        "{{#firm}}Invoice {{invoice_number}} is overdue.{{/firm}}",
        { tone: "firm", invoice_number: "INV/2026/0001" },
        context,
      ),
    ).toBe("Invoice INV/2026/0001 is overdue.");
  });

  it("does not resolve tags inside a dropped section", () => {
    // A switched-off clause should vanish whole, not leave its gaps behind.
    expect(
      resolveTags(
        "{{#final}}Owing {{amount}}.{{/final}}kept",
        { tone: "friendly", amount: "5000" },
        context,
      ),
    ).toBe("kept");
  });

  it("drops a section for a field that does not exist at all", () => {
    expect(resolveTags("{{#nope}}text{{/nope}}", {}, context)).toBe("");
  });

  it("treats an empty string field as switched off", () => {
    expect(resolveTags("{{#note}}x{{/note}}", { note: "" }, context)).toBe("");
  });

  it("handles nested sections without leaving braces", () => {
    const result = resolveTags(
      "{{#outer}}A{{#inner}}B{{/inner}}C{{/outer}}",
      { outer: true, inner: true },
      context,
    );

    expect(result).toBe("ABC");
    expect(result).not.toContain("{{");
  });
});

describe("missingRequired", () => {
  const schema = {
    fields: [
      { name: "a", label: "A", type: "text" as const, required: true },
      { name: "b", label: "B", type: "text" as const },
      { name: "c", label: "C", type: "checkbox" as const, required: true },
    ],
  };

  it("names the empty required fields", () => {
    const missing = missingRequired(schema, { a: "", b: "", c: false });
    expect(missing.map((f) => f.name)).toEqual(["a", "c"]);
  });

  it("treats whitespace as empty", () => {
    const missing = missingRequired(schema, { a: "   ", c: true });
    expect(missing.map((f) => f.name)).toEqual(["a"]);
  });

  it("returns nothing when everything required is filled", () => {
    expect(missingRequired(schema, { a: "x", c: true })).toEqual([]);
  });

  it("ignores optional fields", () => {
    const missing = missingRequired(schema, { a: "x", b: "", c: true });
    expect(missing).toEqual([]);
  });
});

/**
 * The seeded templates are data, and data can be wrong in ways types cannot
 * catch — a tag naming a field that does not exist renders as a gap in a real
 * contract. These check the shipped templates, not the engine.
 */
describe("seeded templates", () => {
  const TAG = /\{\{\s*([\w.]+)\s*\}\}/g;

  /**
   * Tags supplied by the invoice calculation rather than by a form field.
   *
   * The invoice has its own PDF component and does not render through the body
   * template, but the template still declares these so the two stay in step if
   * it ever does. Listing them here is the contract: anything else unresolved
   * is a bug.
   */
  const COMPUTED_TAGS = new Set([
    "invoice_number",
    "tax_breakdown",
    "total",
    "subtotal",
    "line_items",
  ]);

  for (const template of templatesSeed) {
    const label = `${template.docType}/${template.region}`;

    it(`${label}: every body tag resolves to a field or context path`, () => {
      const fieldNames = new Set(template.schema.fields.map((f) => f.name));
      const unresolved: string[] = [];

      for (const block of template.body.blocks) {
        for (const text of [block.heading ?? "", block.text]) {
          for (const match of text.matchAll(TAG)) {
            const tag = match[1];
            // A dotted tag reads from context; a bare one must be a field
            // or a value the calculation supplies.
            if (
              !tag.includes(".") &&
              !fieldNames.has(tag) &&
              !COMPUTED_TAGS.has(tag)
            ) {
              unresolved.push(tag);
            }
          }
        }
      }

      expect(unresolved).toEqual([]);
    });

    it(`${label}: renders with no leftover braces once filled`, () => {
      const values = buildPrefill(template.schema, context);

      // Fill everything, so anything still unresolved is a template bug.
      for (const field of template.schema.fields) {
        values[field.name] =
          field.type === "checkbox" ? true : `value-${field.name}`;
      }
      for (const tag of COMPUTED_TAGS) values[tag] = `value-${tag}`;

      const blocks = renderBody(template.body, values, context);

      for (const block of blocks) {
        expect(block.text).not.toContain("{{");
        expect(block.heading ?? "").not.toContain("{{");
      }
    });

    it(`${label}: has a body and at least one field`, () => {
      expect(template.body.blocks.length).toBeGreaterThan(0);
      expect(template.schema.fields.length).toBeGreaterThan(0);
    });
  }

  it("covers all six document types in all three regions", () => {
    expect(templatesSeed).toHaveLength(18);
  });
});
