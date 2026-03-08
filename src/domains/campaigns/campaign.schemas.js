import { z } from "zod";

export const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  objective: z.enum(["pipeline", "revenue", "conversion"]),
  target_value: z.number().nonnegative().default(0),
  currency: z.string().length(3).default("USD"),
  created_by: z.string().min(1).max(64),
  channels: z.array(z.string().min(1).max(32)).default([]),
  audience_definition: z.record(z.any()).default({}),
  tracking: z.object({
    utm_source_default: z.string().max(64).optional(),
    utm_campaign: z.string().max(128).optional()
  }).optional()
});

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  objective: z.enum(["pipeline", "revenue", "conversion"]).optional(),
  target_value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  channels: z.array(z.string().min(1).max(32)).optional(),
  audience_definition: z.record(z.any()).optional(),
  tracking: z.object({
    utm_source_default: z.string().max(64).optional(),
    utm_campaign: z.string().max(128).optional()
  }).optional()
});

export const TransitionCampaignSchema = z.object({
  to_status: z.enum(["draft", "in_review", "approved", "live", "ended"])
});
