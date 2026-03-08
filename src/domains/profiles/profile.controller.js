import { UpsertProfileSchema } from "./profile.schemas.js";
import { profileService } from "./profile.service.js";
import { withIdempotency } from "../../utils/idempotency.js";

export const profileController = {
  async upsert(req, res, next) {
    try {
      const input = UpsertProfileSchema.parse(req.body);

      const result = await withIdempotency(req, "POST:/v1/profiles/upsert", async () => {
        const body = await profileService.upsert(input, req.requestId);
        return { status: 200, body };
      });

      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  }
};
