/**
 * Template shape — how a document type describes its own form and body.
 *
 * The point of putting this in the database rather than in code is regional
 * expansion: a new country is new `templates` rows, not a new release. Keep
 * anything country-specific in the data, and anything structural in here.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "currency"
  | "select"
  | "checkbox"
  | "line_items";

export type TemplateField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
  /**
   * Dotted path used to pre-fill from context the user has already given us:
   * "profile.businessName", "client.name", "project.title". The magic moment
   * depends on forms arriving mostly filled in.
   */
  prefill?: string;
};

export type TemplateSchema = {
  fields: TemplateField[];
};

/** A body block. `text` may contain `{{merge_tags}}` naming fields or context paths. */
export type TemplateBlock = {
  id: string;
  heading?: string;
  text: string;
};

export type TemplateBody = {
  blocks: TemplateBlock[];
};
