import { IngestRevenueSchema } from "./revenue.schemas.js";
import { revenueService } from "./revenue.service.js";
import { withIdempotency } from "../../utils/idempotency.js";

export const revenueController = {
  async ingest(req, res, next) {
    try {
      const input = IngestRevenueSchema.parse(req.body);
      const orgId = req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";

      const result = await withIdempotency(req, "POST:/v1/revenue-events/ingest", async () => {
        const body = await revenueService.ingest(input, req.requestId, orgId);
        return { status: 202, body };
      });

      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  }
};
