import { Router } from "express";
import { approvalController } from "./approval.controller.js";
import { enforceApprovalRoleMatch } from "../../middleware/rbac.js";

export const approvalRouter = Router();
// GET routes don't need role enforcement (they're just reading data)
approvalRouter.get("/ai-assets", approvalController.listPendingAIAssets);
approvalRouter.get("/ai-assets/:aiAssetId/status", approvalController.getAIAssetApprovalStatus);
// POST routes need role enforcement (they're creating approvals)
approvalRouter.post("/ai-assets/:aiAssetId", enforceApprovalRoleMatch(), approvalController.approveAIAsset);
approvalRouter.post("/", enforceApprovalRoleMatch(), approvalController.create);
