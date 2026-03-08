import { newId } from "../../utils/id.js";
import { approvalRepo } from "./approval.repo.js";
import { auditRepo } from "../audit/audit.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";
import * as aiAssetsRepo from "../ai_assets/ai_assets.repo.js";
import { contentService } from "../content/content.service.js";

export const approvalService = {
  async createApproval(input, requestId) {
    const approvalId = newId("apr");

    await approvalRepo.insertApproval({
      id: approvalId,
      contentAssetId: input.content_asset_id,
      contentVersion: input.content_version,
      role: input.role,
      decision: input.decision,
      comments: input.comments,
      actorType: input.actor.type,
      actorId: input.actor.actor_id
    });

    await auditRepo.write({
      actorType: input.actor.type === "ai" ? "ai" : "human",
      actorId: input.actor.actor_id,
      action: "approval.recorded",
      entityType: "approval",
      entityId: approvalId,
      metadata: { requestId, contentAssetId: input.content_asset_id, contentVersion: input.content_version }
    });

    await outboxRepo.enqueue({
      eventType: "approval.recorded",
      entityType: "approval",
      entityId: approvalId,
      payload: { approvalId, contentAssetId: input.content_asset_id, contentVersion: input.content_version, role: input.role }
    });

    return { approval_id: approvalId };
  },

  async listPendingAIAssets(orgId, query = {}) {
    return await approvalRepo.listPendingAIAssets(orgId, query);
  },

  async getApprovalStatusForAIAsset(orgId, aiAssetId) {
    return await approvalRepo.getApprovalStatusForAIAsset(orgId, aiAssetId);
  },

  async approveAIAsset(orgId, aiAssetId, role, decision, comments, actor, requestId) {
    // Get the AI asset
    const aiAsset = await aiAssetsRepo.getAsset(orgId, aiAssetId);
    if (!aiAsset) {
      throw new Error("AI asset not found");
    }

    // Map AI asset type to content asset type
    const typeMap = {
      email: "email",
      ad: "ad",
      landing: "landing"
    };
    const contentType = typeMap[aiAsset.asset_type] || "email";

    // Create Content Asset from AI Asset
    // Note: Multiple AI assets can become one Content Asset (1 content asset may come from many AI assets)
    // For now, we create a new Content Asset each time an AI Asset is approved
    // In the future, you might want to merge multiple AI assets into one Content Asset
    const contentAssetResult = await contentService.createAssetWithV1({
      campaign_id: aiAsset.campaign_id,
      type: contentType,
      format: "json",
      title: `${aiAsset.asset_type} - ${aiAsset.channel}`,
      content: {
        text: aiAsset.content_text,
        asset_type: aiAsset.asset_type,
        channel: aiAsset.channel,
        tone: aiAsset.tone,
        source: "ai_asset",
        ai_asset_id: aiAssetId
      },
      generated_by: {
        type: "ai",
        model: "veroai",
        run_id: aiAsset.id,
        actor_id: actor.actor_id
      }
    }, requestId);

    const contentAssetId = contentAssetResult.content_asset_id;
    const contentVersion = contentAssetResult.version;

    // Create approval record for the Content Asset
    const approvalId = newId("apr");
    await approvalRepo.insertApproval({
      id: approvalId,
      contentAssetId,
      contentVersion,
      role,
      decision,
      comments,
      actorType: actor.type,
      actorId: actor.actor_id
    });

    // Update AI Asset status if approved by both roles
    if (decision === "approved") {
      // Check if both Legal and CMO have approved this Content Asset
      const approvals = await approvalRepo.getApprovalStatusForContentAsset(orgId, contentAssetId, contentVersion);
      const hasLegal = approvals.some(a => a.role === "legal" && a.decision === "approved");
      const hasCMO = approvals.some(a => a.role === "cmo" && a.decision === "approved");
      
      if (hasLegal && hasCMO) {
        // Both approved - update AI Asset status
        await aiAssetsRepo.updateStatus(orgId, aiAssetId, "approved");
      }
    } else if (decision === "rejected") {
      await aiAssetsRepo.updateStatus(orgId, aiAssetId, "rejected");
    }

    await auditRepo.write({
      actorType: actor.type === "ai" ? "ai" : "human",
      actorId: actor.actor_id,
      action: "ai_asset.approved",
      entityType: "ai_asset",
      entityId: aiAssetId,
      metadata: { requestId, contentAssetId, role, decision }
    });

    return { 
      approval_id: approvalId,
      content_asset_id: contentAssetId,
      content_version: contentVersion,
      ai_asset_id: aiAssetId
    };
  }
};
