import { IngestEventsSchema } from "./event.schemas.js";
import { eventService } from "./event.service.js";
import { withIdempotency } from "../../utils/idempotency.js";

export const eventController = {
  async ingest(req, res, next) {
    try {
      const input = IngestEventsSchema.parse(req.body);

      const result = await withIdempotency(req, "POST:/v1/events/ingest", async () => {
        const body = await eventService.ingest(input, req.requestId);
        return { status: 202, body };
      });

      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  }
};
