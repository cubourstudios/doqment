import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(1, "Enter the client's name").max(200),
  company: z.string().max(200).optional().or(z.literal("")),
  email: z
    .string()
    .email("That doesn't look like an email address")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .length(2, "Select the client's country")
    .transform((v) => v.toUpperCase()),
  taxId: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;
