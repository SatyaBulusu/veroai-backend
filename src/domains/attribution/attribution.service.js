import { newId } from "../../utils/id.js";
import { HttpError } from "../../utils/httpError.js";
import { pool } from "../../config/db.js";
import { revenueRepo } from "../revenue/revenue.repo.js";
import { attributionRepo } from "./attribution.repo.js";
import { auditRepo } from "../audit/audit.repo.js";
import { outboxRepo } from "../outbox/outbox.repo.js";

/**
 * V1 attribution:
 * - last_touch: most recent event in window with campaign_id
 * - linear: equal split across distinct campaigns in window
 */
async function fetchCandidateEvents(profileId, revenueOccurredAt, windowDays, orgId) {
  // Calculate window start explicitly for debugging
  const windowStart = new Date(revenueOccurredAt);
  windowStart.setDate(windowStart.getDate() - windowDays);
  
  console.log('Fetching candidate events:', {
    profileId,
    revenueOccurredAt,
    windowDays,
    orgId,
    windowStart: windowStart.toISOString(),
    windowEnd: revenueOccurredAt
  });

  const [rows] = await pool.query(
    `
    SELECT campaign_id, occurred_at, id
    FROM events
    WHERE profile_id=?
      AND org_id=?
      AND campaign_id IS NOT NULL
      AND occurred_at >= DATE_SUB(?, INTERVAL ? DAY)
      AND occurred_at <= ?
    ORDER BY occurred_at ASC
    `,
    [profileId, orgId, revenueOccurredAt, windowDays, revenueOccurredAt]
  );
  
  console.log('SQL query returned:', {
    rowCount: rows.length,
    rows: rows.map(r => ({
      event_id: r.id,
      campaign_id: r.campaign_id,
      occurred_at: r.occurred_at,
      occurred_at_type: typeof r.occurred_at,
      occurred_at_value: String(r.occurred_at),
      occurred_at_iso: r.occurred_at ? new Date(r.occurred_at).toISOString() : null
    }))
  });
  
  return rows;
}

export const attributionService = {
  // Process multiple models in parallel
  async runAttributionForModels(revenueEventId, models, windowDays, requestId, orgId) {
    const revenue = await revenueRepo.getRevenueEvent(revenueEventId);
    if (!revenue) throw new HttpError(404, "Revenue event not found");

    // Run all models in parallel for better performance
    const results = await Promise.allSettled(
      models.map(model => 
        this.runAttribution(
          {
            revenue_event_id: revenueEventId,
            model: model,
            window_days: windowDays
          },
          requestId,
          orgId
        )
      )
    );

    // Process results and errors
    const successes = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successes.push({
          model: models[index],
          ...result.value
        });
      } else {
        errors.push({
          model: models[index],
          error: result.reason?.message || String(result.reason)
        });
      }
    });

    return {
      revenue_event_id: revenueEventId,
      models: models,
      window_days: windowDays,
      results: successes,
      ...(errors.length > 0 && { errors })
    };
  },

  // Single model attribution (internal use)
  async runAttribution(input, requestId, orgId) {
    const revenue = await revenueRepo.getRevenueEvent(input.revenue_event_id);
    if (!revenue) throw new HttpError(404, "Revenue event not found");

    console.log('Starting attribution run:', {
      revenueEventId: input.revenue_event_id,
      revenueProfileId: revenue.profile_id,
      revenueOccurredAt: revenue.occurred_at,
      revenueOrgId: revenue.org_id,
      orgId,
      model: input.model,
      windowDays: input.window_days
    });

    const runId = newId("atr");
    await attributionRepo.createRun({
      id: runId,
      revenueEventId: input.revenue_event_id,
      model: input.model,
      windowDays: input.window_days
    });

    await attributionRepo.setRunStatus(runId, "running");

    try {
      const candidates = await fetchCandidateEvents(revenue.profile_id, revenue.occurred_at, input.window_days, orgId || revenue.org_id);
      
      // Debug logging
      console.log('Attribution candidates:', {
        profileId: revenue.profile_id,
        revenueEventId: input.revenue_event_id,
        revenueOccurredAt: revenue.occurred_at,
        windowDays: input.window_days,
        candidateCount: candidates.length,
        candidates: candidates.map(c => ({ campaign_id: c.campaign_id, occurred_at: c.occurred_at }))
      });

      // Filter out null/undefined campaign IDs and ensure we have valid values
      const validCandidates = candidates.filter(c => c.campaign_id != null && c.campaign_id !== '');
      const distinct = [...new Set(validCandidates.map(c => String(c.campaign_id).trim()))];

      console.log('Distinct campaigns:', distinct);

      const signals = {
        window_days: input.window_days,
        event_count: validCandidates.length,
        distinct_campaigns: distinct.length,
        chosen_strategy: input.model
      };

      const resultId = newId("ars");
      const contributions = [];

      if (distinct.length === 0) {
        await attributionRepo.insertResult({
          id: resultId,
          runId,
          revenueEventId: input.revenue_event_id,
          model: input.model,
          confidenceScore: 10.0,
          signals: { ...signals, note: "No campaign events in window" }
        });
      } else if (input.model === "last_touch") {
        if (validCandidates.length === 0) {
          throw new Error("No valid candidates found for last_touch attribution");
        }
        // Explicitly find the most recent event by timestamp (don't rely on array order)
        const last = validCandidates.reduce((latest, current) => {
          const currentTime = new Date(current.occurred_at).getTime();
          const latestTime = new Date(latest.occurred_at).getTime();
          return currentTime > latestTime ? current : latest;
        });
        
        console.log('Last touch selected:', { 
          campaign_id: last.campaign_id, 
          occurred_at: last.occurred_at,
          totalCandidates: validCandidates.length,
          allCandidates: validCandidates.map(c => ({ 
            campaign_id: c.campaign_id, 
            occurred_at: c.occurred_at,
            timestamp: new Date(c.occurred_at).getTime()
          }))
        });
        contributions.push({ campaign_id: last.campaign_id, weight: 1.0 });
        await attributionRepo.insertResult({
          id: resultId,
          runId,
          revenueEventId: input.revenue_event_id,
          model: input.model,
          confidenceScore: 60.0,
          signals: { ...signals, last_touch_at: last.occurred_at }
        });
      } else {
        const w = 1.0 / distinct.length;
        for (const c of distinct) contributions.push({ campaign_id: c, weight: w });
        await attributionRepo.insertResult({
          id: resultId,
          runId,
          revenueEventId: input.revenue_event_id,
          model: input.model,
          confidenceScore: 50.0,
          signals
        });
      }

      for (const c of contributions) {
        await attributionRepo.insertContribution({ resultId, campaignId: c.campaign_id, weight: c.weight });
      }

      await attributionRepo.setRunStatus(runId, "completed");

      await auditRepo.write({
        actorType: "system",
        actorId: "attribution",
        action: "attribution.completed",
        entityType: "attribution_run",
        entityId: runId,
        metadata: { requestId, revenueEventId: input.revenue_event_id, model: input.model }
      });

      await outboxRepo.enqueue({
        eventType: "attribution.completed",
        entityType: "attribution_run",
        entityId: runId,
        payload: { runId, revenueEventId: input.revenue_event_id }
      });

      return { attribution_run_id: runId, status: "completed", revenue_event_id: input.revenue_event_id };
    } catch (err) {
      await attributionRepo.setRunStatus(runId, "failed", err.message);
      throw err;
    }
  },

  async getLatestResultByRevenueEvent(revenueEventId) {
    const result = await attributionRepo.getResultByRevenueEventId(revenueEventId);
    if (!result) throw new HttpError(404, "Attribution result not found for revenue_event_id");

    const contributions = await attributionRepo.getContributions(result.id);
    return {
      attribution_result_id: result.id,
      revenue_event_id: result.revenue_event_id,
      model: result.model,
      confidence_score: result.confidence_score,
      signals: typeof result.signals_json === "string" ? JSON.parse(result.signals_json) : result.signals_json,
      contributions
    };
  }
};
