import { Router } from "express";
import { campaignController } from "./campaign.controller.js";

export const campaignRouter = Router();

// List and get campaigns
campaignRouter.get("/", campaignController.listCampaigns);
campaignRouter.get("/:campaignId", campaignController.getCampaign);

// Create and update campaigns
campaignRouter.post("/", campaignController.create);
campaignRouter.put("/:campaignId", campaignController.update);
campaignRouter.post("/:campaignId/transition", campaignController.transition);

// Campaign drill-down endpoints
campaignRouter.get("/:campaignId/content-assets", campaignController.listContentAssets);
campaignRouter.get("/:campaignId/approvals", campaignController.getApprovalsMatrix);
campaignRouter.get("/:campaignId/metrics", campaignController.getCampaignMetrics);
