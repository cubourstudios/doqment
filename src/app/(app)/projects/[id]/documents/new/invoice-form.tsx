"use client";

import { useActionState, useMemo, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { calculateInvoice } from "@/lib/invoice/calculate";
import { formatMinor } from "@/lib/invoice/money";
import { GST_RATES } from "@/lib/schemas/invoice";
import { addDays } from "@/lib/invoice/round-trip";
import type { DocumentState } from "../actions";

type Line = { id: number; description: string; quantity: string; unitPrice: string };

export type InvoiceFormContext = {
  currency: string;
  supplierCountry: string;
  supplierStateCode: string | null;
  clientCountry: string | null;
  clientStateCode: string | null;
  registered: boolean;
  nextInvoiceNumber: string;
  defaultDescription: string;
  /** The user's saved payment details, seeded into a new invoice's notes. */
  defaultNotes: string;
};

/**
 * The terms a freelancer actually offers. "Due on receipt" exists because it is
 * the honest option for a small job, not because anyone enjoys chasing it.
 */
const PAYMENT_TERMS = [
  { days: 0, label: "On receipt" },
  { days: 7, label: "Net 7" },
  { days: 15, label: "Net 15" },
  { days: 30, label: "Net 30" },
] as const;

const TODAY = () => new Date().toISOString().slice(0, 10);

// Shared counter for lines added after the first render. Seeded past any
// initial rows so an edited invoice cannot hand two lines the same key.
let nextLineId = 1000;

export type InvoiceFormInitial = {
  issueDate: string;
  dueDate: string;
  discount: string;
  notes: string;
  taxRateBasisPoints: number;
  lineItems: { description: string; quantity: string; unitPrice: string }[];
};

/**
 * Serves both creating and editing an invoice.
 *
 * One component rather than two: the moment either gained a field the other
 * would quietly lack it, and a create/edit pair that disagree about what an
 * invoice contains is how a corrected invoice loses a line.
 */
export function InvoiceForm({
  action,
  context,
  initial,
  submitLabel = "Create invoice",
  pendingLabel = "Creating…",
}: {
  action: (state: DocumentState, formData: FormData) => Promise<DocumentState>;
  context: InvoiceFormContext;
  initial?: InvoiceFormInitial;
  submitLabel?: string;
  pendingLabel?: string;
}) {
  const [state, formAction] = useActionState<DocumentState, FormData>(action, {});

  const [lines, setLines] = useState<Line[]>(() =>
    initial
      ? initial.lineItems.map((item, index) => ({ id: index, ...item }))
      : [
          {
            id: 0,
            description: context.defaultDescription,
            quantity: "1",
            unitPrice: "",
          },
        ],
  );
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? TODAY);
  // Net 30 by default when creating: the most common term, and it guarantees
  // the invoice can actually become overdue rather than sitting outside the
  // tracking entirely. An edit keeps whatever was already chosen.
  const [dueDate, setDueDate] = useState(
    () => initial?.dueDate ?? addDays(TODAY(), 30),
  );
  const [discount, setDiscount] = useState(initial?.discount ?? "");
  const [rate, setRate] = useState(
    initial?.taxRateBasisPoints ?? (context.registered ? 1800 : 0),
  );

  /**
   * A live preview only. The server recomputes all of this from the same raw
   * inputs before anything is stored — a total that arrived from a form is a
   * number the user could have edited.
   */
  const totals = useMemo(() => {
    try {
      return calculateInvoice({
        lineItems: lines,
        currency: context.currency,
        discount,
        tax: {
          supplierCountry: context.supplierCountry,
          supplierStateCode: context.supplierStateCode,
          clientCountry: context.clientCountry,
          clientStateCode: context.clientStateCode,
          rateBasisPoints: rate,
          registered: context.registered && rate > 0,
        },
      });
    } catch {
      // An incomplete form is the normal state while typing, not an error to
      // shout about — the totals panel simply waits.
      return null;
    }
  }, [lines, discount, rate, context]);

  const updateLine = (id: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );

  return (
    <form action={formAction} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input
            id="issueDate"
            name="issueDate"
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
      </div>

      {/*
        Payment terms as one tap.

        This is not decoration. An invoice saved without a due date can never
        become overdue, so the dashboard's headline number quietly excludes it —
        the user is chasing money the product has silently stopped tracking.
        Defaulting to 30 days and offering the common terms means the field is
        filled by default rather than skipped, and "Net 30" is the vocabulary
        already on most freelancers' invoices.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Payment terms</span>
        {PAYMENT_TERMS.map((term) => {
          const value = addDays(issueDate, term.days);
          const selected = dueDate === value;

          return (
            <Button
              key={term.days}
              type="button"
              variant={selected ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={selected}
              onClick={() => setDueDate(value)}
            >
              {term.label}
            </Button>
          );
        })}
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Line items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((current) => [
                ...current,
                { id: nextLineId++, description: "", quantity: "1", unitPrice: "" },
              ])
            }
          >
            <PlusIcon />
            Add line
          </Button>
        </div>

        {lines.map((line, index) => (
          <div key={line.id} className="grid gap-3 rounded-lg border p-3">
            <div className="grid gap-2">
              <Label htmlFor={`desc-${line.id}`}>Description</Label>
              <Input
                id={`desc-${line.id}`}
                name="lineDescription"
                value={line.description}
                onChange={(e) =>
                  updateLine(line.id, { description: e.target.value })
                }
                placeholder="What are you billing for?"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor={`qty-${line.id}`}>Quantity</Label>
                <Input
                  id={`qty-${line.id}`}
                  name="lineQuantity"
                  // decimal, not numeric: fractional hours are normal here and
                  // a numeric keypad on iOS has no decimal point.
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.id, { quantity: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`price-${line.id}`}>Unit price</Label>
                <Input
                  id={`price-${line.id}`}
                  name="lineUnitPrice"
                  inputMode="decimal"
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(line.id, { unitPrice: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* Labelled, because an unexplained figure under two inputs
                  reads as a stray character rather than this line's total. */}
              <span className="text-sm">
                <span className="text-muted-foreground">Line total </span>
                <span className="font-medium tabular-nums">
                  {totals?.lines[index]
                    ? formatMinor(totals.lines[index].amount, context.currency)
                    : "—"}
                </span>
              </span>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    setLines((current) =>
                      current.filter((l) => l.id !== line.id),
                    )
                  }
                >
                  <Trash2Icon />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="discount">Discount</Label>
          <Input
            id="discount"
            name="discount"
            inputMode="decimal"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="taxRateBasisPoints">Tax rate</Label>
          <Select
            name="taxRateBasisPoints"
            value={String(rate)}
            onValueChange={(v) => setRate(Number(v))}
          >
            <SelectTrigger id="taxRateBasisPoints" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GST_RATES.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <InvoiceTotals totals={totals} currency={context.currency} />

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initial?.notes ?? context.defaultNotes}
          placeholder="Payment terms, bank details, thank-you note"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <p className="text-muted-foreground text-sm">
          {initial
            ? `Keeps its number, ${context.nextInvoiceNumber}.`
            : `This invoice will be numbered ${context.nextInvoiceNumber}.`}
        </p>
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

function InvoiceTotals({
  totals,
  currency,
}: {
  totals: ReturnType<typeof calculateInvoice> | null;
  currency: string;
}) {
  if (!totals) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
        Fill in the line items to see the total.
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-lg border p-4 text-sm">
      <Row label="Subtotal" value={formatMinor(totals.subtotal, currency)} />

      {totals.discount > 0n ? (
        <Row
          label="Discount"
          value={`− ${formatMinor(totals.discount, currency)}`}
        />
      ) : null}

      {totals.tax.components.map((component) => (
        <Row
          key={component.label}
          label={`${component.label} (${component.rateBasisPoints / 100}%)`}
          value={formatMinor(component.amount, currency)}
        />
      ))}

      {totals.tax.note ? (
        <p className="text-muted-foreground text-xs">{totals.tax.note}</p>
      ) : null}

      <div className="mt-1 flex justify-between border-t pt-2 text-base font-semibold">
        <span>Total</span>
        <span>{formatMinor(totals.total, currency)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
