import { z } from "zod";

const ProfileRefSchema = z.object({
  profile_id: z.string().optional(),
  identifiers: z.object({
    email: z.string().email().optional(),
    user_id: z.string().max(255).optional(),
    crm_id: z.string().max(255).optional(),
    anonymous_id: z.string().max(255).optional()
  }).optional()
}).refine((v) => v.profile_id || (v.identifiers && Object.values(v.identifiers).some(Boolean)), {
  message: "profile_ref must include profile_id or at least one identifier"
});

export const IngestRevenueSchema = z.object({
  revenue_events: z.array(z.object({
    external_id: z.string().max(128).optional(),
    source: z.enum(["crm", "billing", "csv"]),
    profile_ref: ProfileRefSchema,
    amount: z.number().positive(),
    currency: z.string().length(3).default("USD"),
    timestamp: z.string(), // ISO
    properties: z.record(z.any()).default({})
  })).min(1),
  dedupe: z.boolean().default(true)
});
