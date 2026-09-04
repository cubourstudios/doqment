"use client";

import { useActionState, useState } from "react";

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
import { COUNTRIES, getCountryConfig } from "@/lib/regions";
import { businessTypeEnum } from "@/db/schema";
import {
  completeOnboarding,
  type OnboardingState,
} from "@/app/onboarding/actions";

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

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );

  // Country is tracked in state purely so the tax-ID field can relabel itself
  // as you choose — "GSTIN" means something to an Indian freelancer that
  // "Tax ID" does not.
  const [country, setCountry] = useState<string>("");
  const config = country ? getCountryConfig(country) : null;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          autoComplete="name"
          autoCapitalize="words"
          required
        />
        <p className="text-muted-foreground text-sm">
          This is the name that appears on your documents.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="country">Where are you based?</Label>
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
        <p className="text-muted-foreground text-sm">
          {config
            ? `Sets your currency to ${config.currency} and your invoice format.`
            : "Sets your currency, invoice format and tax fields."}
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="profession">What do you do?</Label>
        <Input
          id="profession"
          name="profession"
          placeholder="UI designer, developer, copywriter…"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          name="businessName"
          placeholder="Leave blank to use your own name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="businessType">How do you operate?</Label>
        <Select name="businessType">
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
        <p className="text-muted-foreground text-sm">
          Changes the signature block and invoice header on your documents.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="taxId">{config?.taxIdLabel ?? "Tax ID"}</Label>
        <Input
          id="taxId"
          name="taxId"
          autoCapitalize="characters"
          placeholder="Optional — you can add this later"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">
          Business address
          <span className="text-muted-foreground font-normal"> (optional)</span>
        </Label>
        <Textarea
          id="address"
          name="address"
          rows={3}
          placeholder="Appears on your invoices"
        />
        {/* Optional here on purpose: this screen has to stay under a minute.
            The invoice form asks again at the point the address actually
            matters, which is where someone will understand why. */}
        <p className="text-muted-foreground text-sm">
          A tax invoice needs your address to be valid in most countries, India
          included.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Setting up…">Finish setup</SubmitButton>
    </form>
  );
}
