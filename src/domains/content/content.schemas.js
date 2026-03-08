import { z } from "zod";

export const CreateContentAssetSchema = z.object({
  campaign_id: z.string().min(1),
  type: z.enum(["email", "ad", "landing"]),
  format: z.string().max(16).default("json"),
  title: z.string().max(255).optional(),
  content: z.record(z.any()),
  generated_by: z.object({
    type: z.enum(["ai", "human"]),
    model: z.string().max(64).optional(),
    run_id: z.string().max(64).optional(),
    actor_id: z.string().max(64).optional()
  })
});

export const AddVersionSchema = z.object({
  content: z.record(z.any()),
  generated_by: CreateContentAssetSchema.shape.generated_by
});
