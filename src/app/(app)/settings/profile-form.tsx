"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { COUNTRIES, getCountryConfig } from "@/lib/regions";
import { businessTypeEnum } from "@/db/schema";
import type { Profile } from "@/lib/auth";
import { updateProfile, type ProfileState } from "./actions";

const BUSINESS_TYPE_LABELS: Record<
  (typeof businessTypeEnum.enumValues)[number],
  string
> = {
  individual: "Individual / freelancer",
  sole_proprietorship: "Sole proprietorship",
  partnership: "Partnership",
  llp: "LLP",
  private_limited: "Private limited company",
  other: "Something else",
};

export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile;
  email: string | undefined;
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateProfile,
    {},
  );
  const [country, setCountry] = useState(profile.country ?? "");
  const config = getCountryConfig(country);

  useEffect(() => {
    if (state.saved) toast.success("Saved");
  }, [state.saved]);

  return (
    <form action={formAction} className="grid gap-5">
      {email ? (
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          {/* Changing an account's email is an auth-level operation with its own
              confirmation flow, so it isn't editable in this form. */}
          <Input id="email" value={email} disabled readOnly />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={profile.name ?? ""}
          autoComplete="name"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="country">Country</Label>
        <Select name="country" value={country} onValueChange={setCountry} required>
          <SelectTrigger id="country">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profession">Profession</Label>
        <Input
          id="profession"
          name="profession"
          defaultValue={profile.profession ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          defaultValue={profile.businessName ?? ""}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="businessType">Business type</Label>
        <Select name="businessType" defaultValue={profile.businessType ?? undefined}>
          <SelectTrigger id="businessType">
            <SelectValue placeholder="Select one" />
          </SelectTrigger>
          <SelectContent>
            {businessTypeEnum.enumValues.map((value) => (
              <SelectItem key={value} value={value}>
                {BUSINESS_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="taxId">{config.taxIdLabel ?? "Tax ID"}</Label>
        <Input
          id="taxId"
          name="taxId"
          defaultValue={profile.taxId ?? ""}
          autoCapitalize="characters"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Saving…" className="w-full sm:w-auto">
        Save changes
      </SubmitButton>
    </form>
  );
}
