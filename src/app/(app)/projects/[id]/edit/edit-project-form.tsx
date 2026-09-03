"use client";

import { useActionState } from "react";

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
import {
  projectStatusEnum,
  projectTypeEnum,
  valueBandEnum,
} from "@/db/schema";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  valueBandLabel,
} from "@/lib/labels";
import type { ProjectState } from "../../actions";

type Defaults = {
  title: string;
  projectType: (typeof projectTypeEnum.enumValues)[number];
  valueBand: (typeof valueBandEnum.enumValues)[number];
  status: (typeof projectStatusEnum.enumValues)[number];
  startDate: string;
  endDate: string;
};

export function EditProjectForm({
  action,
  defaults,
  currency,
}: {
  action: (state: ProjectState, formData: FormData) => Promise<ProjectState>;
  defaults: Defaults;
  currency: string;
}) {
  const [state, formAction] = useActionState<ProjectState, FormData>(action, {});

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Project name</Label>
        <Input id="title" name="title" defaultValue={defaults.title} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={defaults.status} required>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {projectStatusEnum.enumValues.map((value) => (
              <SelectItem key={value} value={value}>
                {PROJECT_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="projectType">Kind of work</Label>
        <Select name="projectType" defaultValue={defaults.projectType} required>
          <SelectTrigger id="projectType">
            <SelectValue />
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
        <Label htmlFor="valueBand">Value</Label>
        <Select name="valueBand" defaultValue={defaults.valueBand} required>
          <SelectTrigger id="valueBand">
            <SelectValue />
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
          Changing this changes which documents we recommend.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Starts</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaults.startDate}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">Ends</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaults.endDate}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
