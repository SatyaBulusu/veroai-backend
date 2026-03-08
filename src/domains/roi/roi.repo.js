import { db } from "../../db/mysql.js";

/**
 * Attribution revenue by campaign (weight-based schema):
 * attributed_revenue = SUM(revenue_events.amount * attribution_contributions.weight)
 *
 * Assumptions (current prototype):
 * - attribution_results has: (id, org_id, revenue_event_id)
 * - attribution_contributions has: (org_id, attribution_result_id, campaign_id, weight)
 */
export async function attributedRevenueByCampaign(orgId, { window_days = 30, model = "last_touch" } = {}) {
  const days = Number(window_days) || 30;
  const attributionModel = model || "last_touch";

  const [rows] = await db.query(
    `SELECT ac.campaign_id,
            SUM(re.amount * ac.weight) AS attributed_revenue_sum,
            COUNT(DISTINCT re.id) AS revenue_events
     FROM revenue_events re
     JOIN attribution_results ar
       ON ar.org_id = re.org_id AND ar.revenue_event_id = re.id
     JOIN attribution_contributions ac
       ON ac.org_id = re.org_id AND ac.attribution_result_id = ar.id
     WHERE re.org_id = ?
       AND ar.model = ?
       AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY ac.campaign_id`,
    [orgId, attributionModel, days]
  );

  return rows.map(r => ({
    campaign_id: r.campaign_id,
    attributed_revenue_sum: Number(r.attributed_revenue_sum || 0),
    revenue_events: Number(r.revenue_events || 0)
  }));
}
