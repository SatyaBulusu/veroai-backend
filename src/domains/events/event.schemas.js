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

export const IngestEventsSchema = z.object({
  events: z.array(z.object({
    client_event_id: z.string().max(64).optional(),
    profile_ref: ProfileRefSchema,
    name: z.string().min(1).max(64),
    timestamp: z.string(),
    campaign_id: z.string().optional(),
    properties: z.record(z.any()).default({})
  })).min(1)
});
