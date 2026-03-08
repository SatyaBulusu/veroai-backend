import { CreateCampaignSchema, UpdateCampaignSchema, TransitionCampaignSchema } from "./campaign.schemas.js";
import { withIdempotency } from "../../utils/idempotency.js";
import { campaignService } from "./campaign.service.js";
import { HttpError } from "../../utils/httpError.js";

function orgId(req) {
  return req.orgId || req.auth?.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";
}

export const campaignController = {
  async create(req, res, next) {
    try {
      const input = CreateCampaignSchema.parse(req.body);
      const result = await withIdempotency(req, "POST:/v1/campaigns", async () => {
        const body = await campaignService.createCampaign(orgId(req), input, req.requestId);
        return { status: 201, body };
      });
      res.status(result.status).json(result.body);
    } catch (e) {
      next(e);
    }
  },

  async getCampaign(req, res, next) {
    try {
      const campaignId = req.params.campaignId;
      const body = await campaignService.getCampaign(orgId(req), campaignId);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  },

  async listCampaigns(req, res, next) {
    try {
      const { status, q } = req.query;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
      const body = await campaignService.listCampaigns(orgId(req), { status, q, limit, offset });
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  },

  async transition(req, res, next) {
    try {
      const campaignId = req.params.campaignId;
      const input = TransitionCampaignSchema.parse(req.body);
      const actorId = req.header("X-Actor-Id");
      if (!actorId) throw new HttpError(400, "Missing X-Actor-Id header");

      const body = await campaignService.transitionCampaign(orgId(req), campaignId, input.to_status, actorId, req.requestId);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  },

  async listContentAssets(req, res, next) {
    try {
      const campaignId = req.params.campaignId;
      const body = await campaignService.listContentAssets(orgId(req), campaignId);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  },

  async getApprovalsMatrix(req, res, next) {
    try {
      const campaignId = req.params.campaignId;
      const body = await campaignService.getApprovalsMatrix(orgId(req), campaignId);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  },

  async getCampaignMetrics(req, res, next) {
    try {
      const campaignId = req.params.campaignId;
      const windowDays = req.query.window_days ? parseInt(String(req.query.window_days), 10) : 30;
      const body = await campaignService.getCampaignMetrics(orgId(req), campaignId, windowDays);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  },

  async update(req, res, next) {
    try {
      const campaignId = req.params.campaignId;
      const input = UpdateCampaignSchema.parse(req.body);
      const body = await campaignService.updateCampaign(orgId(req), campaignId, input, req.requestId);
      res.status(200).json(body);
    } catch (e) {
      next(e);
    }
  }
};
