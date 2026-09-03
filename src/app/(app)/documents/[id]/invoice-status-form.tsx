"use client";

import { useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { invoiceStatusEnum } from "@/db/schema";
import { INVOICE_STATUS_LABELS } from "@/lib/labels";
import { updateInvoiceStatus } from "../actions";

export function InvoiceStatusForm({
  documentId,
  status,
}: {
  documentId: string;
  status: (typeof invoiceStatusEnum.enumValues)[number];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateInvoiceStatus} className="grid gap-2">
      <input type="hidden" name="documentId" value={documentId} />

      <Label htmlFor="status">Status</Label>
      <Select
        name="status"
        defaultValue={status}
        // Submitting on change keeps this to one tap. Marking an invoice paid
        // is the most repeated action in the product, and a separate Save
        // button doubles the work for no safety — the change is reversible.
        onValueChange={() => formRef.current?.requestSubmit()}
      >
        <SelectTrigger id="status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {invoiceStatusEnum.enumValues.map((value) => (
            <SelectItem key={value} value={value}>
              {INVOICE_STATUS_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-muted-foreground text-sm">
        Cancel rather than delete an invoice you no longer need — the number
        stays allocated, which is what keeps the series intact.
      </p>
    </form>
  );
}
