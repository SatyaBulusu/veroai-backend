import { z } from "zod";

export const CreateApprovalSchema = z.object({
  content_asset_id: z.string().min(1),
  content_version: z.number().int().positive(),
  role: z.enum(["legal", "cmo"]),
  decision: z.enum(["approved", "rejected"]),
  comments: z.string().max(5000).optional(),
  actor: z.object({
    type: z.enum(["human", "ai"]),
    actor_id: z.string().min(1).max(64)
  })
});
