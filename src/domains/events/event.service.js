import { newId } from "../../utils/id.js";
import { HttpError } from "../../utils/httpError.js";
import { profileRepo } from "../profiles/profile.repo.js";
import { eventRepo } from "./event.repo.js";
import { auditRepo } from "../audit/audit.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";

const idPriority = ["email", "user_id", "crm_id", "anonymous_id"];

async function resolveProfileId(profileRef) {
  if (profileRef.profile_id) return profileRef.profile_id;

  const ids = profileRef.identifiers ?? {};
  for (const k of idPriority) {
    const v = ids[k];
    if (!v) continue;
    const found = await profileRepo.findByIdentifier(k, v);
    if (found) return found;
  }

  // V1: auto-create a person profile if unknown (extensible later)
  const profileId = newId("pro");
  await profileRepo.insertProfile(profileId, "person", null);
  for (const [k, v] of Object.entries(ids)) {
    if (!v) continue;
    await profileRepo.insertIdentifier(profileId, k, v);
  }
  return profileId;
}

export const eventService = {
  async ingest(input, requestId) {
    let accepted = 0;
    let rejected = 0;
    const errors = [];

    for (const e of input.events) {
      try {
        const occurredAt = new Date(e.timestamp);
        if (isNaN(occurredAt.getTime())) throw new HttpError(400, "Invalid timestamp");

        const profileId = await resolveProfileId(e.profile_ref);

        const eventId = newId("evt");
        await eventRepo.insertEvent({
          id: eventId,
          clientEventId: e.client_event_id,
          profileId,
          name: e.name,
          occurredAt,
          properties: e.properties,
          campaignId: e.campaign_id
        });

        await auditRepo.write({
          actorType: "system",
          actorId: "events",
          action: "event.ingested",
          entityType: "event",
          entityId: eventId,
          metadata: { requestId, profileId, campaignId: e.campaign_id ?? null }
        });

        await outboxRepo.enqueue({
          eventType: "event.ingested",
          entityType: "event",
          entityId: eventId,
          payload: { eventId, profileId, campaignId: e.campaign_id ?? null }
        });

        accepted += 1;
      } catch (err) {
        rejected += 1;
        errors.push({ message: err.message });
      }
    }

    return { accepted, rejected, errors };
  }
};
