import { CreateApprovalSchema } from "./approval.schemas.js";
import { approvalService } from "./approval.service.js";
import { withIdempotency } from "../../utils/idempotency.js";
import { z } from "zod";

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

const ApproveAIAssetSchema = z.object({
  ai_asset_id: z.string().min(1),
  role: z.enum(["legal", "cmo"]),
  decision: z.enum(["approved", "rejected"]),
  comments: z.string().max(5000).optional(),
  actor: z.object({
    type: z.enum(["human", "ai"]),
    actor_id: z.string().min(1).max(64)
  })
});

export const approvalController = {
  async create(req, res, next) {
    try {
      const input = CreateApprovalSchema.parse(req.body);
      const result = await withIdempotency(req, "POST:/v1/approvals", async () => {
        const body = await approvalService.createApproval(input, req.requestId);
        return { status: 201, body };
      });
      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  },

  async listPendingAIAssets(req, res, next) {
    try {
      const query = {
        campaign_id: req.query.campaign_id || null
      };
      const items = await approvalService.listPendingAIAssets(orgId(req), query);
      res.status(200).json({ items });
    } catch (e) {
      next(e);
    }
  },

  async approveAIAsset(req, res, next) {
    try {
      const aiAssetId = req.params.aiAssetId;
      const input = ApproveAIAssetSchema.parse({ ...req.body, ai_asset_id: aiAssetId });
      const result = await withIdempotency(req, `POST:/v1/approvals/ai-assets/${aiAssetId}`, async () => {
        const body = await approvalService.approveAIAsset(
          orgId(req),
          input.ai_asset_id,
          input.role,
          input.decision,
          input.comments,
          input.actor,
          req.requestId
        );
        return { status: 201, body };
      });
      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  },

  async getAIAssetApprovalStatus(req, res, next) {
    try {
      const aiAssetId = req.params.aiAssetId;
      const approvals = await approvalService.getApprovalStatusForAIAsset(orgId(req), aiAssetId);
      res.status(200).json({ items: approvals });
    } catch (e) {
      next(e);
    }
  }
};
