import { CreateContentAssetSchema, AddVersionSchema } from "./content.schemas.js";
import { contentService } from "./content.service.js";
import { withIdempotency } from "../../utils/idempotency.js";

export const contentController = {
  async create(req, res, next) {
    try {
      const input = CreateContentAssetSchema.parse(req.body);
      const result = await withIdempotency(req, "POST:/v1/content-assets", async () => {
        const body = await contentService.createAssetWithV1(input, req.requestId);
        return { status: 201, body };
      });
      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  },

  async addVersion(req, res, next) {
    try {
      const assetId = req.params.assetId;
      const input = AddVersionSchema.parse(req.body);
      const result = await withIdempotency(req, "POST:/v1/content-assets/:assetId/versions", async () => {
        const body = await contentService.addVersion(assetId, input, req.requestId);
        return { status: 201, body };
      });
      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  }
};
