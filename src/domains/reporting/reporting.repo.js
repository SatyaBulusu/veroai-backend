import { pool } from "../../config/db.js";

/**
 * Read model with org isolation.
 * (Write paths can continue relying on org_local defaults for single-org local dev.)
 */
export const reportingRepo = {
  async getExecutiveDashboard(orgId, windowDays, topN) {
    const n = Math.min(Math.max(topN ?? 10, 1), 25);

    const [top] = await pool.query(
      `
      SELECT
        c.id AS campaign_id,
        c.name,
        c.status,
        c.objective,
        c.target_value,
        c.currency,
        COALESCE(SUM(re.amount * ac.weight), 0) AS attributed_revenue
      FROM campaigns c
      LEFT JOIN attribution_contributions ac ON ac.org_id = c.org_id AND ac.campaign_id = c.id
      LEFT JOIN attribution_results ar ON ar.org_id = ac.org_id AND ar.id = ac.attribution_result_id
      LEFT JOIN revenue_events re ON re.org_id = ar.org_id AND re.id = ar.revenue_event_id
        AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      WHERE c.org_id = ?
      GROUP BY c.id, c.name, c.status, c.objective, c.target_value, c.currency
      ORDER BY attributed_revenue DESC
      LIMIT ?
      `,
      [windowDays, orgId, n]
    );

    const [blocked] = await pool.query(
      `
      SELECT c.id AS campaign_id, c.name, c.updated_at
      FROM campaigns c
      WHERE c.org_id=? AND c.status='in_review'
        AND NOT EXISTS (
          SELECT 1
          FROM approvals a
          JOIN content_assets ca ON ca.id = a.content_asset_id AND ca.org_id = a.org_id
          WHERE a.org_id = ? AND ca.campaign_id = c.id
            AND a.decision='approved'
            AND a.role IN ('legal','cmo')
          GROUP BY a.content_asset_id, a.content_version
          HAVING COUNT(DISTINCT a.role)=2
        )
      ORDER BY c.updated_at DESC
      LIMIT 25
      `,
      [orgId, orgId]
    );

    const [[summary]] = await pool.query(
      `
      SELECT
        COUNT(*) AS campaigns_total,
        SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) AS campaigns_in_review,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS campaigns_approved,
        SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS campaigns_live
      FROM campaigns
      WHERE org_id=?
      `,
      [orgId]
    );

    return {
      org_id: orgId,
      window_days: windowDays,
      summary: {
        campaigns_total: Number(summary.campaigns_total ?? 0),
        campaigns_in_review: Number(summary.campaigns_in_review ?? 0),
        campaigns_approved: Number(summary.campaigns_approved ?? 0),
        campaigns_live: Number(summary.campaigns_live ?? 0)
      },
      top_campaigns_by_attributed_revenue: top.map(r => ({ ...r, attributed_revenue: Number(r.attributed_revenue ?? 0) })),
      campaigns_blocked_in_approvals: blocked
    };
  }
};
