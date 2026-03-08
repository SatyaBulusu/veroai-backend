import * as metrics from "./executive.metrics.repo.js";
import * as store from "./executive.store.repo.js";

export async function getSummary(orgId, q = {}) {
  const window_days = Number(q.window_days || 30);
  const top = Number(q.top || 5);
  const model = q.model || "last_touch";

  const [spend_sum, attributed_revenue_sum, top_spend, top_revenue, spend_channels, campaign_stats] = await Promise.all([
    metrics.spendTotals(orgId, window_days),
    metrics.attributedRevenueTotals(orgId, window_days, model),
    metrics.spendByCampaign(orgId, window_days, top),
    metrics.attributedRevenueByCampaign(orgId, window_days, top, model),
    metrics.spendByChannel(orgId, window_days, top),
    metrics.campaignStatistics(orgId)
  ]);

  const roi_multiple = spend_sum > 0 ? attributed_revenue_sum / spend_sum : null;
  const net_roi = spend_sum > 0 ? (attributed_revenue_sum - spend_sum) / spend_sum : null;

  const { startDate, endDate } = windowToDates(window_days);
  const budgets = await metrics.budgetsForWindow(orgId, startDate, endDate);
  const budgetIds = budgets.map(b => b.id);
  const allocations = await metrics.allocationsForBudgets(orgId, budgetIds);

  const total_budget_amount = budgets.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
  const budget_utilization = total_budget_amount > 0 ? spend_sum / total_budget_amount : null;

  return {
    window_days,
    model,
    window: { start_date: startDate, end_date: endDate },
    kpis: {
      spend_sum,
      attributed_revenue_sum,
      roi_multiple,
      net_roi,
      total_budget_amount,
      budget_utilization
    },
    summary: campaign_stats,
    top: {
      campaigns_by_spend: top_spend,
      campaigns_by_attributed_revenue: top_revenue,
      channels_by_spend: spend_channels
    },
    budgets: { items: budgets, allocations_count: allocations.length }
  };
}

export async function generateInsights(orgId, body = {}) {
  const window_days = Number(body.window_days || 30);
  const top = Number(body.top || 5);
  const thresholds = body.thresholds || { low_roi_multiple: 0.8, high_spend: 1000 };

  const summary = await getSummary(orgId, { window_days, top });

  const spendById = new Map(summary.top.campaigns_by_spend.map(x => [x.campaign_id, x.spend_sum]));
  const revById = new Map(summary.top.campaigns_by_attributed_revenue.map(x => [x.campaign_id, x.attributed_revenue_sum]));
  const ids = new Set([...spendById.keys(), ...revById.keys()]);

  const campaignRows = [...ids].map(id => {
    const s = Number(spendById.get(id) || 0);
    const r = Number(revById.get(id) || 0);
    const roi = s > 0 ? r / s : null;
    return { campaign_id: id, spend_sum: s, attributed_revenue_sum: r, roi_multiple: roi };
  }).sort((a, b) => (b.roi_multiple ?? -1) - (a.roi_multiple ?? -1));

  const insights = [];

  insights.push({
    insight_type: "org_snapshot",
    severity: "low",
    entity_type: "org",
    entity_id: null,
    title: `${window_days}-day performance snapshot`,
    facts: summary.kpis,
    recommendation: summary.kpis.roi_multiple !== null && summary.kpis.roi_multiple < 1
      ? { action: "review_spend", note: "ROI below 1.0x; consider pausing lowest-performing campaigns." }
      : { action: "scale_winners", note: "ROI healthy; consider scaling top campaigns and testing new creatives." }
  });

  const topRow = campaignRows.find(r => r.roi_multiple !== null);
  if (topRow) {
    insights.push({
      insight_type: "top_campaign_roi",
      severity: "low",
      entity_type: "campaign",
      entity_id: topRow.campaign_id,
      title: "Top ROI campaign (in observed set)",
      facts: topRow,
      recommendation: { action: "increase_budget", note: "Increase allocation; replicate winning creative/targeting learnings." }
    });
  }

  for (const row of campaignRows) {
    if (row.roi_multiple === null) continue;
    if (row.spend_sum >= Number(thresholds.high_spend || 0) && row.roi_multiple < Number(thresholds.low_roi_multiple || 1)) {
      insights.push({
        insight_type: "budget_risk",
        severity: "high",
        entity_type: "campaign",
        entity_id: row.campaign_id,
        title: "High spend with low ROI",
        facts: row,
        recommendation: { action: "reduce_or_pause", note: "Reduce spend; run new experiments; verify targeting and attribution." }
      });
    }
  }

  const finalInsights = insights.slice(0, 25);
  await store.clearInsights(orgId, window_days);
  const inserted = await store.insertInsights(orgId, window_days, finalInsights);
  return { window_days, inserted_count: inserted.length, items: inserted };
}

export async function listInsights(orgId, q = {}) {
  const window_days = Number(q.window_days || 30);
  return store.listInsights(orgId, window_days, q);
}

export async function generateNarrative(orgId, body = {}) {
  const window_days = Number(body.window_days || 30);
  const audience = String(body.audience || "cmo").toLowerCase();
  const top = Number(body.top || 3);

  const summary = await getSummary(orgId, { window_days, top });
  const insights = await store.listInsights(orgId, window_days, { limit: 10, offset: 0 });

  const md = renderNarrativeMarkdown(summary, insights.items, audience);
  const out = await store.upsertNarrative(orgId, window_days, audience, md, {
    summary,
    insight_ids: insights.items.map(i => i.id)
  });
  return out;
}

export async function getLatestNarrative(orgId, q = {}) {
  const window_days = Number(q.window_days || 30);
  const audience = String(q.audience || "cmo").toLowerCase();
  const n = await store.getLatestNarrative(orgId, window_days, audience);
  if (!n) {
    const e = new Error("Narrative not found. Generate it first.");
    e.statusCode = 404;
    throw e;
  }
  return n;
}

function windowToDates(windowDays) {
  const end = new Date();
  const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const toDate = d => d.toISOString().slice(0, 10);
  return { startDate: toDate(start), endDate: toDate(end) };
}

function money(n) {
  return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pct(n) {
  if (n === null || n === undefined) return "n/a";
  return (Number(n) * 100).toFixed(1) + "%";
}

function renderNarrativeMarkdown(summary, insights, audience) {
  const { kpis } = summary;
  const roi = kpis.roi_multiple === null ? "n/a" : (kpis.roi_multiple).toFixed(2) + "x";
  const net = kpis.net_roi === null ? "n/a" : pct(kpis.net_roi);

  const headline = audience === "cfo"
    ? `### Executive Finance Brief (last ${summary.window_days} days)`
    : `### Executive Marketing Brief (last ${summary.window_days} days)`;

  const lines = [];
  lines.push(headline, "");
  lines.push(`- **Spend:** $${money(kpis.spend_sum)}`);
  lines.push(`- **Attributed revenue:** $${money(kpis.attributed_revenue_sum)}`);
  lines.push(`- **ROI:** ${roi} (net: ${net})`);

  if (kpis.total_budget_amount && kpis.total_budget_amount > 0) {
    lines.push(`- **Budget utilization:** ${pct(kpis.budget_utilization)} (budget: $${money(kpis.total_budget_amount)})`);
  }

  lines.push("", "#### Highlights");

  const topCampaign = insights.find(i => i.insight_type === "top_campaign_roi");
  if (topCampaign) {
    const f = safeJson(topCampaign.facts_json);
    lines.push(`- Top ROI campaign in observed set: \`${topCampaign.entity_id}\` (ROI: ${(f.roi_multiple ?? 0).toFixed(2)}x, spend: $${money(f.spend_sum)})`);
  } else {
    lines.push("- No top ROI campaign insight available yet (need more spend + attribution data).");
  }

  const risks = insights.filter(i => i.insight_type === "budget_risk");
  if (risks.length) {
    lines.push("", "#### Risks / Actions");
    for (const r of risks.slice(0, 3)) {
      const f = safeJson(r.facts_json);
      lines.push(`- **High spend + low ROI** on \`${r.entity_id}\`: spend $${money(f.spend_sum)}, ROI ${(f.roi_multiple ?? 0).toFixed(2)}x → consider reducing spend or testing new variants.`);
    }
  }

  lines.push("", "> Note: This narrative is generated from deterministic metrics and structured insights. No numbers are invented.");
  return lines.join("\n");
}

function safeJson(v) {
  if (!v) return {};
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return {}; }
}
