import { z } from "zod";

import { businessTypeEnum } from "@/db/schema";

/**
 * Onboarding is one screen and asks for the minimum that changes what the
 * product does later: country drives currency, the tax-ID label, the invoice
 * format and the numbering series, so it is the only truly required field
 * besides a name to put on documents.
 */
export const onboardingSchema = z.object({
  name: z.string().min(1, "Enter your name").max(120),
  country: z
    .string()
    .length(2, "Select your country")
    .transform((v) => v.toUpperCase()),
  profession: z.string().max(120).optional().or(z.literal("")),
  businessName: z.string().max(200).optional().or(z.literal("")),
  businessType: z.enum(businessTypeEnum.enumValues).optional(),
  taxId: z.string().max(50).optional().or(z.literal("")),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
