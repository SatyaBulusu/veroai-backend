import { HttpError } from "../../utils/httpError.js";
import { newId } from "../../utils/id.js";
import { contentRepo } from "./content.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";
import { auditRepo } from "../audit/audit.repo.js";

function actorFromGeneratedBy(gb) {
  const actorType = gb.type === "ai" ? "ai" : "human";
  const actorId = gb.type === "ai" ? (gb.run_id ?? "ai") : (gb.actor_id ?? "unknown");
  return { actorType, actorId };
}

export const contentService = {
  async createAssetWithV1(input, requestId) {
    const assetId = newId("cta");
    const versionId = newId("cav");

    await contentRepo.createAsset({
      assetId,
      campaignId: input.campaign_id,
      type: input.type,
      format: input.format,
      title: input.title
    });

    await contentRepo.insertVersion({
      versionId,
      contentAssetId: assetId,
      version: 1,
      content: input.content,
      generatedByType: input.generated_by.type,
      model: input.generated_by.model,
      runId: input.generated_by.run_id
    });

    const { actorType, actorId } = actorFromGeneratedBy(input.generated_by);

    await auditRepo.write({
      actorType,
      actorId,
      action: "content_asset.created",
      entityType: "content_asset",
      entityId: assetId,
      metadata: { requestId, version: 1 }
    });

    await outboxRepo.enqueue({
      eventType: "content_asset.created",
      entityType: "content_asset",
      entityId: assetId,
      payload: { contentAssetId: assetId, version: 1 }
    });

    return { content_asset_id: assetId, version: 1 };
  },

  async addVersion(assetId, input, requestId) {
    const asset = await contentRepo.getAsset(assetId);
    if (!asset) throw new HttpError(404, "Content asset not found");

    const version = await contentRepo.getNextVersion(assetId);
    const versionId = newId("cav");

    await contentRepo.insertVersion({
      versionId,
      contentAssetId: assetId,
      version,
      content: input.content,
      generatedByType: input.generated_by.type,
      model: input.generated_by.model,
      runId: input.generated_by.run_id
    });

    const { actorType, actorId } = actorFromGeneratedBy(input.generated_by);

    await auditRepo.write({
      actorType,
      actorId,
      action: "content_asset.version_added",
      entityType: "content_asset",
      entityId: assetId,
      metadata: { requestId, version }
    });

    await outboxRepo.enqueue({
      eventType: "content_asset.version_added",
      entityType: "content_asset",
      entityId: assetId,
      payload: { contentAssetId: assetId, version }
    });

    return { content_asset_id: assetId, version };
  }
};
