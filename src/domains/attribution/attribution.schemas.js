import { z } from "zod";

export const CreateAttributionRunSchema = z.object({
  revenue_event_id: z.string().min(1),
  models: z.array(z.enum(["last_touch", "linear"])).min(1),
  window_days: z.number().int().positive().max(365).default(90)
});
