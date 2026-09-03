import { z } from "zod";

import { projectStatusEnum, projectTypeEnum, valueBandEnum } from "@/db/schema";

/**
 * Project creation, kept to five fields so it can be finished in under a minute
 * (PRD F3). Four of them exist because the guidance engine needs them: project
 * type, value band, the client's country and whether the client is new are
 * exactly the dimensions the rules match on.
 *
 * The client is either one already saved, or a name typed inline — making
 * someone create a client record first would double the length of the flow.
 */
export const projectSchema = z
  .object({
    title: z.string().min(1, "Give the project a name").max(200),
    clientId: z.string().uuid().optional().or(z.literal("")),
    newClientName: z.string().max(200).optional().or(z.literal("")),
    newClientCountry: z.string().max(2).optional().or(z.literal("")),
    projectType: z.enum(projectTypeEnum.enumValues, {
      errorMap: () => ({ message: "Select the kind of work" }),
    }),
    valueBand: z.enum(valueBandEnum.enumValues, {
      errorMap: () => ({ message: "Select roughly what it's worth" }),
    }),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.clientId) || Boolean(data.newClientName), {
    message: "Choose a client or enter a new one",
    path: ["clientId"],
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.endDate) >= new Date(data.startDate),
    { message: "The end date can't be before the start date", path: ["endDate"] },
  );

export const projectUpdateSchema = z.object({
  title: z.string().min(1, "Give the project a name").max(200),
  projectType: z.enum(projectTypeEnum.enumValues),
  valueBand: z.enum(valueBandEnum.enumValues),
  status: z.enum(projectStatusEnum.enumValues),
  startDate: z.string().optional().or(z.literal("")),
  endDate: z.string().optional().or(z.literal("")),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
