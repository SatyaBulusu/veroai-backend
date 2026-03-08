import { z } from "zod";

// Support both "model" (singular) and "models" (plural) for backward compatibility
export const CreateAttributionRunSchema = z.preprocess(
  (data) => {
    if (data && typeof data === "object" && "model" in data && !("models" in data)) {
      // Convert singular "model" to plural "models" array
      return {
        ...data,
        models: [data.model],
        model: undefined
      };
    }
    return data;
  },
  z.object({
    revenue_event_id: z.string().min(1),
    models: z.array(z.enum(["last_touch", "linear"])).min(1),
    window_days: z.number().int().positive().max(365).default(90)
  })
);
