import { db } from "../../db/mysql.js";

export async function spendTotals(orgId, windowDays) {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS spend_sum
     FROM campaign_costs
     WHERE org_id = ?
       AND COALESCE(occurred_at, cost_date) >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [orgId, windowDays]
  );
  return Number(rows[0]?.spend_sum || 0);
}

export async function spendByCampaign(orgId, windowDays, limit = 10) {
  const [rows] = await db.query(
    `SELECT campaign_id, COALESCE(SUM(amount), 0) AS spend_sum
     FROM campaign_costs
     WHERE org_id = ?
       AND COALESCE(occurred_at, cost_date) >= DATE_SUB(NOW(), INTERVAL ? DAY)
       AND campaign_id IS NOT NULL
     GROUP BY campaign_id
     ORDER BY spend_sum DESC
     LIMIT ?`,
    [orgId, windowDays, Number(limit)]
  );
  return rows.map(r => ({ campaign_id: r.campaign_id, spend_sum: Number(r.spend_sum || 0) }));
}

export async function spendByChannel(orgId, windowDays, limit = 10) {
  const [rows] = await db.query(
    `SELECT channel, COALESCE(SUM(amount), 0) AS spend_sum
     FROM campaign_costs
     WHERE org_id = ?
       AND cost_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY channel
     ORDER BY spend_sum DESC
     LIMIT ?`,
    [orgId, windowDays, Number(limit)]
  );
  return rows.map(r => ({ channel: r.channel, spend_sum: Number(r.spend_sum || 0) }));
}

export async function attributedRevenueTotals(orgId, windowDays, model = "last_touch") {
  const attributionModel = model || "last_touch";
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(re.amount * ac.weight), 0) AS attributed_revenue_sum
     FROM revenue_events re
     JOIN attribution_results ar
       ON ar.org_id = re.org_id AND ar.revenue_event_id = re.id
     JOIN attribution_contributions ac
       ON ac.org_id = re.org_id AND ac.attribution_result_id = ar.id
     WHERE re.org_id = ?
       AND ar.model = ?
       AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [orgId, attributionModel, windowDays]
  );
  return Number(rows[0]?.attributed_revenue_sum || 0);
}

export async function attributedRevenueByCampaign(orgId, windowDays, limit = 10, model = "last_touch") {
  const attributionModel = model || "last_touch";
  const [rows] = await db.query(
    `SELECT ac.campaign_id,
            COALESCE(SUM(re.amount * ac.weight), 0) AS attributed_revenue_sum
     FROM revenue_events re
     JOIN attribution_results ar
       ON ar.org_id = re.org_id AND ar.revenue_event_id = re.id
     JOIN attribution_contributions ac
       ON ac.org_id = re.org_id AND ac.attribution_result_id = ar.id
     WHERE re.org_id = ?
       AND ar.model = ?
       AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY ac.campaign_id
     ORDER BY attributed_revenue_sum DESC
     LIMIT ?`,
    [orgId, attributionModel, windowDays, Number(limit)]
  );
  return rows.map(r => ({ campaign_id: r.campaign_id, attributed_revenue_sum: Number(r.attributed_revenue_sum || 0) }));
}

export async function budgetsForWindow(orgId, startDate, endDate) {
  const [rows] = await db.query(
    `SELECT id, name, currency, total_amount, start_date, end_date
     FROM budgets
     WHERE org_id = ?
       AND NOT (end_date < ? OR start_date > ?)
     ORDER BY start_date ASC`,
    [orgId, startDate, endDate]
  );
  return rows;
}

export async function allocationsForBudgets(orgId, budgetIds) {
  if (!budgetIds?.length) return [];
  const placeholders = budgetIds.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT *
     FROM budget_allocations
     WHERE org_id = ? AND budget_id IN (${placeholders})`,
    [orgId, ...budgetIds]
  );
  return rows;
}

export async function campaignStatistics(orgId) {
  const [rows] = await db.query(
    `SELECT
      COUNT(*) AS campaigns_total,
      SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) AS campaigns_in_review,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS campaigns_approved,
      SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS campaigns_live
    FROM campaigns
    WHERE org_id = ?`,
    [orgId]
  );
  const row = rows[0] || {};
  return {
    campaigns_total: Number(row.campaigns_total || 0),
    campaigns_in_review: Number(row.campaigns_in_review || 0),
    campaigns_approved: Number(row.campaigns_approved || 0),
    campaigns_live: Number(row.campaigns_live || 0)
  };
}
