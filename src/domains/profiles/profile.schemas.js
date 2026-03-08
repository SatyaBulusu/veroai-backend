import { z } from "zod";

export const UpsertProfileSchema = z.object({
  type: z.enum(["person", "account"]).default("person"),
  identifiers: z.object({
    email: z.string().email().optional(),
    user_id: z.string().max(255).optional(),
    crm_id: z.string().max(255).optional(),
    anonymous_id: z.string().max(255).optional()
  }).refine((v) => Object.values(v).some(Boolean), {
    message: "At least one identifier must be provided"
  }),
  attributes: z.record(z.any()).default({}),
  lifecycle_stage: z.string().max(64).optional()
});
