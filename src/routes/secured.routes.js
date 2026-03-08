import { Router } from "express";
import { requireRole, enforceApprovalRoleMatch } from "../middleware/rbac.js";
import { orgInject } from "../middleware/orgInject.js";

import { campaignRouter } from "../domains/campaigns/campaign.routes.js";
import { contentRouter } from "../domains/content/content.routes.js";
import { approvalRouter } from "../domains/approvals/approval.routes.js";
import { auditRouter } from "../domains/audit/audit.routes.js";
import { profileRouter } from "../domains/profiles/profile.routes.js";
import { eventRouter } from "../domains/events/event.routes.js";
import { revenueRouter } from "../domains/revenue/revenue.routes.js";
import { attributionRouter } from "../domains/attribution/attribution.routes.js";
import { reportingRouter } from "../domains/reporting/reporting.routes.js";
import { experimentsRouter } from "../domains/experiments/experiments.routes.js";
import budgetsRoutes from "../domains/budgets/budgets.routes.js";
import campaignCostsRoutes from "../domains/costs/costs.routes.js";
import roiRoutes from "../domains/roi/roi.routes.js";
import executiveRoutes from "../domains/executive/executive.routes.js";
import aiAssetsRoutes from "../domains/ai_assets/ai_assets.routes.js";
import assetsRoutes from "../domains/ai_assets/assets.routes.js";
import campaignAssetsRoutes from "../domains/ai_assets/campaign_assets.routes.js";
import experimentAssetsRoutes from "../domains/ai_assets/experiment_assets.routes.js";
import agentRoutes from "../domains/agent/agent.routes.js";

export const securedV1Router = Router();

securedV1Router.use(
  "/campaigns",
  requireRole("marketing_manager", "marketing_ops", "growth", "cmo","admin"),
  orgInject(),
  campaignRouter
);

securedV1Router.use(
  "/content-assets",
  requireRole("marketing_manager", "marketing_ops", "growth", "admin"),
  orgInject(),
  contentRouter
);

securedV1Router.use(
  "/experiments",
  requireRole("marketing_manager", "marketing_ops", "growth", "cmo", "admin"),
  orgInject(),
  experimentsRouter
);

securedV1Router.use(
  "/approvals",
  requireRole("marketing_manager","legal", "cmo", "admin"),
  orgInject(),
  approvalRouter
);

securedV1Router.use(
  "/audit",
  requireRole("marketing_manager", "marketing_ops", "legal", "cmo", "admin"),
  orgInject(),
  auditRouter
);

securedV1Router.use(
  "/profiles",
  requireRole("marketing_ops", "data_engineer", "system", "admin"),
  orgInject(),
  profileRouter
);

securedV1Router.use(
  "/events",
  requireRole("marketing_ops", "data_engineer", "system", "admin"),
  orgInject(),
  eventRouter
);

securedV1Router.use(
  "/revenue-events",
  requireRole("marketing_ops", "data_engineer", "system", "admin"),
  orgInject(),
  revenueRouter
);

securedV1Router.use(
  "/attribution",
  requireRole("marketing_ops", "data_engineer", "system", "admin"),
  orgInject(),
  attributionRouter
);

securedV1Router.use(
  "/",
  requireRole("marketing_manager", "marketing_ops", "growth", "cmo", "sales", "legal", "admin"),
  reportingRouter
);

securedV1Router.use("/budgets", budgetsRoutes, requireRole("marketing_ops", "finance", "admin"));
securedV1Router.use("/campaign-costs", campaignCostsRoutes, requireRole("marketing_ops", "finance", "cmo", "admin"));
securedV1Router.use("/roi", roiRoutes, requireRole("marketing_ops", "marketing_manager","growth", "cmo","admin"));

securedV1Router.use("/executive", executiveRoutes, requireRole("marketing_ops", "marketing_manager","growth", "cmo","admin"));

securedV1Router.use("/ai/assets", aiAssetsRoutes, requireRole("marketing_manager", "marketing_ops", "growth", "cmo","admin"));
securedV1Router.use("/assets", assetsRoutes, requireRole("marketing_manager", "marketing_ops", "growth", "cmo","admin"));
securedV1Router.use("/campaigns/:campaignId/assets", campaignAssetsRoutes, requireRole("marketing_manager", "marketing_ops", "growth", "cmo","admin"));  

securedV1Router.use("/experiments", experimentAssetsRoutes, requireRole("marketing_manager", "marketing_ops", "growth", "cmo","admin"));  

securedV1Router.use("/agent", agentRoutes, requireRole("marketing_manager", "marketing_ops", "growth", "cmo","admin"));