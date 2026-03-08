import { HttpError } from "../../utils/httpError.js";
import { newId } from "../../utils/id.js";
import { campaignRepo } from "./campaign.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";
import { auditRepo } from "../audit/audit.repo.js";

const allowedTransitions = {
  draft: new Set(["in_review"]),
  in_review: new Set(["draft", "approved"]),
  approved: new Set(["live"]),
  live: new Set(["ended"]),
  ended: new Set([])
};

export const campaignService = {
  async createCampaign(orgId, input, requestId) {
    const campaignId = newId("cam");
    const audienceId = newId("aud");

    await campaignRepo.insertCampaign({
      id: campaignId,
      name: input.name,
      objective: input.objective,
      targetValue: input.target_value,
      currency: input.currency,
      createdBy: input.created_by,
      orgId
    });

    await campaignRepo.insertChannels(orgId, campaignId, input.channels);
    await campaignRepo.insertAudience({ id: audienceId, campaignId, definition: input.audience_definition, orgId });

    if (input.tracking) {
      await campaignRepo.upsertTracking({
        campaignId,
        utmSourceDefault: input.tracking.utm_source_default,
        utmCampaign: input.tracking.utm_campaign,
        orgId
      });
    }

    await auditRepo.write({
      orgId,
      actorType: "human",
      actorId: input.created_by,
      action: "campaign.created",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { requestId }
    });

    await outboxRepo.enqueue({
      orgId,
      eventType: "campaign.created",
      entityType: "campaign",
      entityId: campaignId,
      payload: { campaignId, audienceId }
    });

    return { campaign_id: campaignId, status: "draft" };
  },

  async getCampaign(orgId, campaignId) {
    const campaign = await campaignRepo.getCampaign(orgId, campaignId);
    if (!campaign) throw new HttpError(404, "Campaign not found");
    return campaign;
  },

  async listCampaigns(orgId, { status, q, limit, offset }) {
    return await campaignRepo.listCampaigns(orgId, { status, q, limit, offset });
  },

  async transitionCampaign(orgId, campaignId, toStatus, actorId, requestId) {
    const campaign = await campaignRepo.getCampaign(orgId, campaignId);
    if (!campaign) throw new HttpError(404, "Campaign not found");

    const from = campaign.status;
    if (!allowedTransitions[from]?.has(toStatus)) {
      throw new HttpError(409, `Invalid transition from ${from} to ${toStatus}`);
    }

    if (from === "in_review" && toStatus === "approved") {
      const ok = await campaignRepo.campaignHasFullyApprovedAsset(orgId, campaignId);
      if (!ok) {
        throw new HttpError(
          409,
          "Cannot approve campaign: requires at least one content asset version approved by Legal and CMO."
        );
      }
    }

    await campaignRepo.updateStatus(orgId, campaignId, toStatus);

    await auditRepo.write({
      orgId,
      actorType: "human",
      actorId,
      action: "campaign.transition",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { requestId, from, to: toStatus }
    });

    await outboxRepo.enqueue({
      orgId,
      eventType: "campaign.status_changed",
      entityType: "campaign",
      entityId: campaignId,
      payload: { campaignId, from, to: toStatus }
    });

    return { campaign_id: campaignId, from_status: from, to_status: toStatus };
  },

  async listContentAssets(orgId, campaignId) {
    const items = await campaignRepo.listContentAssetsForCampaign(orgId, campaignId);
    return { campaign_id: campaignId, items };
  },

  async getApprovalsMatrix(orgId, campaignId) {
    const items = await campaignRepo.getApprovalMatrixForCampaign(orgId, campaignId);
    const gating_ok = await campaignRepo.campaignHasFullyApprovedAsset(orgId, campaignId);
    return { campaign_id: campaignId, gating_ok, items };
  },

  async getCampaignMetrics(orgId, campaignId, windowDays) {
    const body = await campaignRepo.getCampaignMetrics(orgId, campaignId, windowDays);
    return { campaign_id: campaignId, ...body };
  },

  async updateCampaign(orgId, campaignId, input, requestId) {
    // Verify campaign exists
    const campaign = await campaignRepo.getCampaign(orgId, campaignId);
    if (!campaign) throw new HttpError(404, "Campaign not found");

    // Update basic campaign fields
    await campaignRepo.updateCampaign(orgId, campaignId, {
      name: input.name,
      objective: input.objective,
      targetValue: input.target_value,
      currency: input.currency
    });

    // Update channels if provided
    if (input.channels !== undefined) {
      await campaignRepo.deleteChannels(orgId, campaignId);
      if (input.channels.length > 0) {
        await campaignRepo.insertChannels(orgId, campaignId, input.channels);
      }
    }

    // Update audience definition if provided
    if (input.audience_definition !== undefined) {
      await campaignRepo.updateAudience(orgId, campaignId, input.audience_definition);
    }

    // Update tracking if provided
    if (input.tracking !== undefined) {
      await campaignRepo.upsertTracking({
        campaignId,
        utmSourceDefault: input.tracking.utm_source_default,
        utmCampaign: input.tracking.utm_campaign,
        orgId
      });
    }

    // Audit log
    await auditRepo.write({
      orgId,
      actorType: "human",
      actorId: "system", // TODO: get from request
      action: "campaign.updated",
      entityType: "campaign",
      entityId: campaignId,
      metadata: { requestId, updates: Object.keys(input) }
    });

    // Get updated campaign
    const updated = await campaignRepo.getCampaign(orgId, campaignId);
    return updated;
  }
};
