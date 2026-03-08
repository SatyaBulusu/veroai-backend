import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function ingestCosts(orgId, items = []) {
  if (!Array.isArray(items)) items = [items];

  const inserted = [];
  for (const it of items) {
    const id = it.id || ulid("cost");
    const campaign_id = it.campaign_id || null;
    const channel = it.channel;
    const cost_date = it.cost_date;
    const amount = Number(it.amount || 0);
    const currency = it.currency || "USD";
    const metadata_json = it.metadata_json ? JSON.stringify(it.metadata_json) : null;

    await db.query(
      `INSERT INTO campaign_costs
        (id, org_id, campaign_id, channel, cost_date, amount, currency, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         campaign_id = VALUES(campaign_id),
         channel = VALUES(channel),
         cost_date = VALUES(cost_date),
         amount = VALUES(amount),
         currency = VALUES(currency),
         metadata_json = VALUES(metadata_json),
         updated_at = CURRENT_TIMESTAMP`,
      [id, orgId, campaign_id, channel, cost_date, amount, currency, metadata_json]
    );

    inserted.push({ id });
  }

  return { inserted_count: inserted.length, items: inserted };
}

export async function sumSpendByCampaign(orgId, { window_days = 30 } = {}) {
  const days = Number(window_days) || 30;
  const [rows] = await db.query(
    `SELECT campaign_id, SUM(amount) AS spend_sum
     FROM campaign_costs
     WHERE org_id = ?
       AND cost_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND campaign_id IS NOT NULL
     GROUP BY campaign_id`,
    [orgId, days]
  );
  return rows.map(r => ({ campaign_id: r.campaign_id, spend_sum: Number(r.spend_sum || 0) }));
}

export async function sumSpendByChannel(orgId, { window_days = 30 } = {}) {
  const days = Number(window_days) || 30;
  const [rows] = await db.query(
    `SELECT channel, SUM(amount) AS spend_sum
     FROM campaign_costs
     WHERE org_id = ?
       AND cost_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY channel
     ORDER BY spend_sum DESC`,
    [orgId, days]
  );
  return rows.map(r => ({ channel: r.channel, spend_sum: Number(r.spend_sum || 0) }));
}
