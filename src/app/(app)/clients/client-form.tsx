"use client";

import { useActionState } from "react";

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
import { COUNTRIES } from "@/lib/regions";
import type { ClientState } from "./actions";

type ClientDefaults = {
  name?: string;
  company?: string | null;
  email?: string | null;
  country?: string | null;
  taxId?: string | null;
  address?: string;
};

export function ClientForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ClientState, formData: FormData) => Promise<ClientState>;
  defaults?: ClientDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ClientState, FormData>(action, {});

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Client name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults?.name ?? ""}
          autoCapitalize="words"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          name="company"
          defaultValue={defaults?.company ?? ""}
          placeholder="If they're contracting through one"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          defaultValue={defaults?.email ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="country">Country</Label>
        <Select name="country" defaultValue={defaults?.country ?? undefined} required>
          <SelectTrigger id="country">
            <SelectValue placeholder="Select their country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          Where the client is based changes which documents we recommend, and
          how tax appears on their invoices.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="taxId">Their tax ID</Label>
        <Input
          id="taxId"
          name="taxId"
          defaultValue={defaults?.taxId ?? ""}
          autoCapitalize="characters"
          placeholder="Optional"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Billing address</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={defaults?.address ?? ""}
          rows={3}
          placeholder="Appears on their invoices"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
