import type {
  TemplateBody,
  TemplateField,
  TemplateSchema,
} from "./types";

/**
 * Turning a template plus form values into a document.
 *
 * Templates live in the database so a new region is new rows rather than a
 * release. That only pays off if nothing here knows what a specific document
 * says — this module resolves `{{merge_tags}}` and nothing more.
 */

/** Context a merge tag can reach beyond the form's own fields. */
export type RenderContext = {
  profile: {
    businessName?: string | null;
    name?: string | null;
    addressJson?: unknown;
    taxId?: string | null;
    country?: string | null;
  };
  client: {
    name?: string | null;
    company?: string | null;
    addressJson?: unknown;
    country?: string | null;
    taxId?: string | null;
  } | null;
  project: {
    title?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  } | null;
};

export type FieldValues = Record<string, string | boolean>;

/**
 * Read a dotted path like "profile.businessName" out of the context.
 *
 * Address values are stored as `{ lines: [...] }` and flattened here, so a
 * template author writes `{{provider_address}}` without knowing the shape.
 */
export function readPath(path: string, context: RenderContext): string {
  const segments = path.split(".");
  let current: unknown = context;

  for (const segment of segments) {
    if (current === null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[segment];
  }

  if (current === null || current === undefined) return "";

  if (typeof current === "object") {
    const lines = (current as { lines?: unknown }).lines;
    if (Array.isArray(lines)) {
      return lines.filter((line) => typeof line === "string").join("\n");
    }
    return "";
  }

  return String(current);
}

/**
 * Initial form values, pre-filled from what the user has already told us.
 *
 * The magic moment depends on forms arriving mostly complete: someone who has
 * entered their business name once should never type it again.
 */
export function buildPrefill(
  schema: TemplateSchema,
  context: RenderContext,
): FieldValues {
  const values: FieldValues = {};

  for (const field of schema.fields) {
    if (field.type === "checkbox") {
      values[field.name] = field.default === true;
      continue;
    }

    // Context first, then the template's own default. A real client name beats
    // a generic starting value, but a starting value beats an empty box.
    const prefilled = field.prefill ? readPath(field.prefill, context) : "";

    values[field.name] =
      prefilled ||
      (typeof field.default === "string" ? field.default : "");
  }

  return values;
}

const TAG_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Conditional sections: `{{#flag}}…{{/flag}}`.
 *
 * The templates need these for clauses that only sometimes apply — an IP
 * transfer clause, a VAT reverse-charge line, the three tones of a payment
 * reminder. Without them a template author would have to duplicate the whole
 * document per variation, which is how regional templates drift apart.
 *
 * A section renders when its flag is a ticked checkbox, or when a select's
 * value equals the flag name — that second rule is what lets one "tone" field
 * drive `{{#friendly}}`, `{{#firm}}` and `{{#final}}`.
 */
const SECTION_PATTERN = /\{\{#\s*(\w+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g;

function sectionIsActive(flag: string, values: FieldValues): boolean {
  if (flag in values) {
    const value = values[flag];
    return typeof value === "boolean" ? value : value.trim() !== "";
  }

  // No field by that name: treat it as one of several options on a select.
  return Object.values(values).some(
    (value) => typeof value === "string" && value === flag,
  );
}

function resolveSections(text: string, values: FieldValues): string {
  // Repeated until stable so nested sections resolve rather than leaving the
  // outer one's braces behind.
  let previous: string;
  let current = text;

  do {
    previous = current;
    current = current.replace(
      SECTION_PATTERN,
      (_match, flag: string, body: string) =>
        sectionIsActive(flag, values) ? body : "",
    );
  } while (current !== previous);

  return current;
}

/**
 * Replace every `{{tag}}` in a string.
 *
 * Form values win over context, so a template can offer a pre-filled field the
 * user is then free to correct. An unresolved tag becomes an empty string
 * rather than being left as literal braces — a document that reads
 * "payable by {{client_name}}" is worse than one with a gap, because the gap
 * is obvious and the braces look like a broken product.
 */
export function resolveTags(
  text: string,
  values: FieldValues,
  context: RenderContext,
): string {
  // Sections first: a clause that is switched off should never have its inner
  // tags resolved, and dropping it whole is cheaper than filling it in.
  return resolveSections(text, values).replace(TAG_PATTERN, (_match, tag: string) => {
    if (tag in values) {
      const value = values[tag];
      // A checkbox reads as a clause being present or absent, not "true".
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return value;
    }

    if (tag.includes(".")) return readPath(tag, context);

    return "";
  });
}

export type RenderedBlock = {
  id: string;
  heading: string | null;
  text: string;
};

export function renderBody(
  body: TemplateBody,
  values: FieldValues,
  context: RenderContext,
): RenderedBlock[] {
  return body.blocks.map((block) => ({
    id: block.id,
    heading: block.heading ? resolveTags(block.heading, values, context) : null,
    text: resolveTags(block.text, values, context),
  }));
}

/**
 * Which required fields are still empty.
 *
 * Returned as a list rather than a boolean so the caller can name them. A form
 * that says only "something is missing" makes the user hunt.
 */
export function missingRequired(
  schema: TemplateSchema,
  values: FieldValues,
): TemplateField[] {
  return schema.fields.filter((field) => {
    if (!field.required) return false;

    const value = values[field.name];
    // A required checkbox means it must be ticked; a required text field means
    // it must be non-empty.
    if (typeof value === "boolean") return !value;

    return !value || value.trim() === "";
  });
}
