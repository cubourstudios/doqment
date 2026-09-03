"use client";

import { useActionState, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { projectTypeEnum, valueBandEnum } from "@/db/schema";
import { PROJECT_TYPE_LABELS, valueBandLabel } from "@/lib/labels";
import { COUNTRIES } from "@/lib/regions";
import { createProject, type ProjectState } from "../actions";

const NEW_CLIENT = "__new__";

export function ProjectForm({
  clients,
  currency,
  defaultCountry,
}: {
  clients: { id: string; name: string }[];
  currency: string;
  defaultCountry: string;
}) {
  const [state, formAction] = useActionState<ProjectState, FormData>(
    createProject,
    {},
  );

  // Default to entering a new client when there are none saved — a select with
  // one "Add new" option in it is a pointless extra tap.
  const [clientChoice, setClientChoice] = useState(
    clients.length === 0 ? NEW_CLIENT : "",
  );
  const addingClient = clientChoice === NEW_CLIENT;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">What&apos;s the project?</Label>
        <Input
          id="title"
          name="title"
          placeholder="Website redesign"
          autoCapitalize="sentences"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="client">Client</Label>
        <Select
          value={clientChoice}
          onValueChange={setClientChoice}
          name={addingClient ? undefined : "clientId"}
        >
          <SelectTrigger id="client">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
            <SelectItem value={NEW_CLIENT}>+ New client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {addingClient ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="newClientName">New client&apos;s name</Label>
            <Input
              id="newClientName"
              name="newClientName"
              autoCapitalize="words"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newClientCountry">Where are they based?</Label>
            <Select name="newClientCountry" defaultValue={defaultCountry}>
              <SelectTrigger id="newClientCountry">
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
              A client abroad changes which documents you need, and how tax
              works on the invoice.
            </p>
          </div>
        </>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="projectType">What kind of work is it?</Label>
        <Select name="projectType" required>
          <SelectTrigger id="projectType">
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            {projectTypeEnum.enumValues.map((value) => (
              <SelectItem key={value} value={value}>
                {PROJECT_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="valueBand">Roughly what&apos;s it worth?</Label>
        <Select name="valueBand" required>
          <SelectTrigger id="valueBand">
            <SelectValue placeholder="Select a range" />
          </SelectTrigger>
          <SelectContent>
            {valueBandEnum.enumValues.map((value) => (
              <SelectItem key={value} value={value}>
                {valueBandLabel(value, currency)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          A rough band is enough. Bigger projects warrant more protection, which
          is what this decides.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Starts</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">Ends</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Creating…">
        Create project
      </SubmitButton>
    </form>
  );
}
