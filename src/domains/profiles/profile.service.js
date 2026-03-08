import { newId } from "../../utils/id.js";
import { profileRepo } from "./profile.repo.js";
import { auditRepo } from "../audit/audit.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";

const idPriority = ["email", "user_id", "crm_id", "anonymous_id"];

export const profileService = {
  async upsert(input, requestId) {
    let profileId = null;

    for (const k of idPriority) {
      const v = input.identifiers[k];
      if (!v) continue;
      profileId = await profileRepo.findByIdentifier(k, v);
      if (profileId) break;
    }

    const created = !profileId;
    if (!profileId) {
      profileId = newId("pro");
      await profileRepo.insertProfile(profileId, input.type, input.lifecycle_stage ?? null);
    } else if (input.lifecycle_stage) {
      await profileRepo.updateLifecycle(profileId, input.lifecycle_stage);
    }

    for (const [k, v] of Object.entries(input.identifiers)) {
      if (!v) continue;
      await profileRepo.insertIdentifier(profileId, k, v);
    }

    for (const [k, v] of Object.entries(input.attributes ?? {})) {
      await profileRepo.upsertAttribute(profileId, k, v);
    }

    await auditRepo.write({
      actorType: "human",
      actorId: "api",
      action: created ? "profile.created" : "profile.updated",
      entityType: "profile",
      entityId: profileId,
      metadata: { requestId, created }
    });

    await outboxRepo.enqueue({
      eventType: created ? "profile.created" : "profile.updated",
      entityType: "profile",
      entityId: profileId,
      payload: { profileId, created }
    });

    return { profile_id: profileId, created };
  }
};
