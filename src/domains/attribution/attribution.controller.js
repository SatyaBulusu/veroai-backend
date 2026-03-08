import { CreateAttributionRunSchema } from "./attribution.schemas.js";
import { attributionService } from "./attribution.service.js";
import { withIdempotency } from "../../utils/idempotency.js";

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";
}

export const attributionController = {
  async createRun(req, res, next) {
    try {
      const input = CreateAttributionRunSchema.parse(req.body);

      const result = await withIdempotency(req, "POST:/v1/attribution/runs", async () => {
        const body = await attributionService.runAttributionForModels(
          input.revenue_event_id,
          input.models,
          input.window_days,
          req.requestId,
          orgId(req)
        );
        return { status: 201, body };
      });

      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  },

  async getResults(req, res, next) {
    try {
      const revenueEventId = req.query.revenue_event_id;
      if (!revenueEventId) return res.status(400).json({ error: "Missing revenue_event_id query param" });

      const body = await attributionService.getLatestResultByRevenueEvent(String(revenueEventId));
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  }
};
