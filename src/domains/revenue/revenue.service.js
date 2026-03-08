import { newId } from "../../utils/id.js";
import { HttpError } from "../../utils/httpError.js";
import { profileRepo } from "../profiles/profile.repo.js";
import { revenueRepo } from "./revenue.repo.js";
import { auditRepo } from "../audit/audit.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";
import { env } from "../../config/env.js";

const idPriority = ["email", "user_id", "crm_id", "anonymous_id"];

// Get base URL for internal service calls
function getInternalApiBaseUrl() {
  // In monolith, use localhost. In microservices, this would be env var
  return process.env.INTERNAL_API_BASE_URL || `http://localhost:${env.port}`;
}

async function triggerAttributionRuns(revenueEventId, models, windowDays, orgId, requestId) {
  const baseUrl = getInternalApiBaseUrl();
  const url = `${baseUrl}/v1/attribution/runs`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Org-Id": orgId,
        "X-Request-Id": requestId || newId("req"),
        // For future microservices: use service-to-service auth
        ...(process.env.INTERNAL_API_KEY ? { "X-API-Key": process.env.INTERNAL_API_KEY } : {})
      },
      body: JSON.stringify({
        revenue_event_id: revenueEventId,
        models: models,
        window_days: windowDays
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Attribution API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (err) {
    // Log but don't throw - attribution failures shouldn't block revenue ingestion
    console.error(`Failed to trigger attribution runs for revenue event ${revenueEventId}:`, err.message);
    throw err; // Re-throw for now, but caller will catch
  }
}

async function resolveProfileId(profileRef) {
  if (profileRef.profile_id) return profileRef.profile_id;

  const ids = profileRef.identifiers ?? {};
  for (const k of idPriority) {
    const v = ids[k];
    if (!v) continue;
    const found = await profileRepo.findByIdentifier(k, v);
    if (found) return found;
  }

  // V1: auto-create a person profile if unknown (replaceable later)
  const profileId = newId("pro");
  await profileRepo.insertProfile(profileId, "person", null);
  for (const [k, v] of Object.entries(ids)) {
    if (!v) continue;
    await profileRepo.insertIdentifier(profileId, k, v);
  }
  return profileId;
}

export const revenueService = {
  async ingest(input, requestId, orgId = "org_local") {
    let accepted = 0;
    let rejected = 0;
    let deduped = 0;
    const errors = [];
    const created_ids = [];

    for (const r of input.revenue_events) {
      try {
        const occurredAt = new Date(r.timestamp);
        if (isNaN(occurredAt.getTime())) throw new HttpError(400, "Invalid timestamp");

        if (input.dedupe && r.external_id) {
          const exists = await revenueRepo.existsByExternal(r.source, r.external_id);
          if (exists) {
            deduped += 1;
            continue;
          }
        }

        const profileId = await resolveProfileId(r.profile_ref);
        const revenueEventId = newId("rev");

        await revenueRepo.insertRevenueEvent({
          id: revenueEventId,
          externalId: r.external_id,
          source: r.source,
          profileId,
          amount: r.amount,
          currency: r.currency,
          occurredAt,
          properties: r.properties
        });

        await auditRepo.write({
          actorType: "system",
          actorId: "revenue",
          action: "revenue_event.ingested",
          entityType: "revenue_event",
          entityId: revenueEventId,
          metadata: { requestId, profileId, source: r.source, externalId: r.external_id ?? null }
        });

        await outboxRepo.enqueue({
          eventType: "revenue_event.ingested",
          entityType: "revenue_event",
          entityId: revenueEventId,
          payload: { revenueEventId, profileId }
        });

        // Automatically run attribution for configured models via HTTP call (non-blocking)
        const attributionModels = env.attribution.autoModels;
        const defaultWindowDays = env.attribution.defaultWindowDays;
        
        // Fire-and-forget: don't await to avoid blocking revenue ingestion
        triggerAttributionRuns(
          revenueEventId,
          attributionModels,
          defaultWindowDays,
          orgId,
          requestId
        ).catch((attrErr) => {
          // Log errors but don't fail revenue ingestion
          console.error(`Failed to trigger attribution runs for revenue event ${revenueEventId}:`, attrErr.message);
        });

        accepted += 1;
        created_ids.push(revenueEventId);
      } catch (err) {
        rejected += 1;
        errors.push({ message: err.message });
      }
    }

    return { accepted, rejected, deduped, created_ids, errors };
  }
};
