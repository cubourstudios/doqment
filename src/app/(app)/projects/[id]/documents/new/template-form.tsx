"use client";

import { useActionState, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { DISCLAIMER_TEXT } from "@/lib/disclaimers";
import type { FieldValues } from "@/lib/templates/render";
import type { TemplateField, TemplateSchema } from "@/lib/templates/types";
import type { DocumentState } from "../actions";

/**
 * The guided form, built from a template's own schema.
 *
 * Nothing here knows what an NDA is. Adding a document type, or a regional
 * variant of one, is a database row — which is the whole reason the schema
 * lives in the database rather than in code.
 */
export function TemplateForm({
  action,
  schema,
  initialValues,
  submitLabel,
  showDisclaimer,
}: {
  action: (state: DocumentState, formData: FormData) => Promise<DocumentState>;
  schema: TemplateSchema;
  initialValues: FieldValues;
  submitLabel: string;
  showDisclaimer: boolean;
}) {
  const [state, formAction] = useActionState<DocumentState, FormData>(
    action,
    {},
  );
  const [values, setValues] = useState<FieldValues>(initialValues);

  const update = (name: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [name]: value }));

  return (
    <form action={formAction} className="grid gap-5">
      {schema.fields.map((field) => (
        <Field
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => update(field.name, value)}
        />
      ))}

      {showDisclaimer ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs leading-relaxed">
          {DISCLAIMER_TEXT}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Creating…">{submitLabel}</SubmitButton>
    </form>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const id = `field-${field.name}`;
  const help = field.help ? (
    <p className="text-muted-foreground text-sm">{field.help}</p>
  ) : null;

  if (field.type === "checkbox") {
    return (
      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id={id}
            name={field.name}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            className="mt-0.5"
          />
          {/* The label is part of the tap target: a 20px box alone is a hard
              thing to hit on a phone. */}
          <Label htmlFor={id} className="leading-snug font-normal">
            {field.label}
          </Label>
        </div>
        {help}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? null : (
          <span className="text-muted-foreground font-normal"> (optional)</span>
        )}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={id}
          name={field.name}
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      ) : field.type === "select" ? (
        <Select
          name={field.name}
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
          required={field.required}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          name={field.name}
          type={field.type === "date" ? "date" : "text"}
          // A numeric keypad without a decimal point is the wrong keyboard for
          // money and for "1.5 days".
          inputMode={
            field.type === "number" || field.type === "currency"
              ? "decimal"
              : undefined
          }
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
        />
      )}

      {help}
    </div>
  );
}
