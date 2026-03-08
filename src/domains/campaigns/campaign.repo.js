import { pool } from "../../config/db.js";
import { newId } from "../../utils/id.js";

export const campaignRepo = {
  async insertCampaign({ id, name, objective, targetValue, currency, createdBy, orgId }) {
    await pool.query(
      `INSERT INTO campaigns (id, org_id, name, objective, target_value, currency, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [id, orgId, name, objective, targetValue, currency, createdBy]
    );
  },

  async insertChannels(orgId, campaignId, channels) {
    for (const ch of channels) {
      await pool.query(
        `INSERT IGNORE INTO campaign_channels (org_id, campaign_id, channel) VALUES (?,?,?)`,
        [orgId, campaignId, ch]
      );
    }
  },

  async deleteChannels(orgId, campaignId) {
    await pool.query(
      `DELETE FROM campaign_channels WHERE org_id=? AND campaign_id=?`,
      [orgId, campaignId]
    );
  },

  async insertAudience({ id, campaignId, definition, orgId }) {
    await pool.query(
      `INSERT INTO audience_definitions (id, org_id, campaign_id, definition_json) VALUES (?,?,?,?)`,
      [id, orgId, campaignId, JSON.stringify(definition)]
    );
  },

  async updateAudience(orgId, campaignId, definition) {
    // Get the latest audience definition ID
    const [[existing]] = await pool.query(
      `SELECT id FROM audience_definitions WHERE org_id=? AND campaign_id=? ORDER BY created_at DESC LIMIT 1`,
      [orgId, campaignId]
    );
    
    if (existing) {
      // Update existing
      await pool.query(
        `UPDATE audience_definitions SET definition_json=? WHERE org_id=? AND id=?`,
        [JSON.stringify(definition), orgId, existing.id]
      );
    } else {
      // Insert new (shouldn't happen, but handle it)
      const audienceId = newId("aud");
      await pool.query(
        `INSERT INTO audience_definitions (id, org_id, campaign_id, definition_json) VALUES (?,?,?,?)`,
        [audienceId, orgId, campaignId, JSON.stringify(definition)]
      );
    }
  },

  async upsertTracking({ campaignId, utmSourceDefault, utmCampaign, orgId }) {
    await pool.query(
      `INSERT INTO campaign_tracking_defaults (org_id, campaign_id, utm_source_default, utm_campaign)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE utm_source_default=VALUES(utm_source_default), utm_campaign=VALUES(utm_campaign)`,
      [orgId, campaignId, utmSourceDefault ?? null, utmCampaign ?? null]
    );
  },

  async getCampaign(orgId, campaignId) {
    const [[campaign]] = await pool.query(`SELECT * FROM campaigns WHERE org_id=? AND id=?`, [orgId, campaignId]);
    if (!campaign) return null;

    const [channels] = await pool.query(
      `SELECT channel FROM campaign_channels WHERE org_id=? AND campaign_id=? ORDER BY channel ASC`,
      [orgId, campaignId]
    );

    const [[aud]] = await pool.query(
      `SELECT definition_json FROM audience_definitions WHERE org_id=? AND campaign_id=? ORDER BY created_at DESC LIMIT 1`,
      [orgId, campaignId]
    );

    const [[tracking]] = await pool.query(
      `SELECT utm_source_default, utm_campaign FROM campaign_tracking_defaults WHERE org_id=? AND campaign_id=?`,
      [orgId, campaignId]
    );

    return {
      ...campaign,
      channels: channels.map(r => r.channel),
      audience_definition: aud
        ? (typeof aud.definition_json === "string" ? JSON.parse(aud.definition_json) : aud.definition_json)
        : null,
      tracking: tracking ?? null
    };
  },

  async listCampaigns(orgId, { status, q, limit, offset }) {
    const lim = Math.min(Math.max(limit ?? 25, 1), 100);
    const off = Math.max(offset ?? 0, 0);

    const params = [orgId];
    const where = ["org_id = ?"];

    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (q) {
      where.push("name LIKE ?");
      params.push(`%${q}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [[cnt]] = await pool.query(`SELECT COUNT(*) AS total FROM campaigns ${whereSql}`, params);

    const [rows] = await pool.query(
      `SELECT id, name, objective, target_value, currency, status, created_by, created_at, updated_at
       FROM campaigns
       ${whereSql}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );

    return { total: Number(cnt.total ?? 0), limit: lim, offset: off, items: rows };
  },

  async updateStatus(orgId, campaignId, status) {
    await pool.query(`UPDATE campaigns SET status=? WHERE org_id=? AND id=?`, [status, orgId, campaignId]);
  },

  async updateCampaign(orgId, campaignId, { name, objective, targetValue, currency }) {
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (objective !== undefined) {
      updates.push("objective = ?");
      params.push(objective);
    }
    if (targetValue !== undefined) {
      updates.push("target_value = ?");
      params.push(targetValue);
    }
    if (currency !== undefined) {
      updates.push("currency = ?");
      params.push(currency);
    }

    if (updates.length === 0) {
      return; // No updates
    }

    params.push(orgId, campaignId);
    await pool.query(
      `UPDATE campaigns SET ${updates.join(", ")} WHERE org_id=? AND id=?`,
      params
    );
  },

  async listContentAssetsForCampaign(orgId, campaignId) {
    const [rows] = await pool.query(
      `
      SELECT
        ca.id AS content_asset_id,
        ca.type,
        ca.format,
        ca.title,
        ca.created_at,
        v.version AS latest_version,
        v.created_at AS latest_version_created_at
      FROM content_assets ca
      LEFT JOIN content_asset_versions v
        ON v.content_asset_id = ca.id AND v.org_id = ca.org_id
      LEFT JOIN content_asset_versions v2
        ON v2.content_asset_id = ca.id AND v2.org_id = ca.org_id AND v2.version > v.version
      WHERE ca.org_id=? AND ca.campaign_id=?
        AND v2.id IS NULL
      ORDER BY ca.created_at DESC
      `,
      [orgId, campaignId]
    );
    return rows;
  },

  async getApprovalMatrixForCampaign(orgId, campaignId) {
    const [rows] = await pool.query(
      `
      WITH latest AS (
        SELECT cav.content_asset_id, MAX(cav.version) AS version
        FROM content_asset_versions cav
        JOIN content_assets ca ON ca.id = cav.content_asset_id AND ca.org_id = cav.org_id
        WHERE ca.org_id = ? AND ca.campaign_id = ?
        GROUP BY cav.content_asset_id
      )
      SELECT
        ca.id AS content_asset_id,
        ca.type,
        ca.title,
        l.version AS version,
        MAX(CASE WHEN a.role='legal' THEN a.decision END) AS legal_decision,
        MAX(CASE WHEN a.role='cmo' THEN a.decision END) AS cmo_decision,
        MAX(CASE WHEN a.role='legal' THEN a.created_at END) AS legal_decision_at,
        MAX(CASE WHEN a.role='cmo' THEN a.created_at END) AS cmo_decision_at
      FROM latest l
      JOIN content_assets ca ON ca.id = l.content_asset_id AND ca.org_id = ?
      LEFT JOIN approvals a
        ON a.org_id = ? AND a.content_asset_id = l.content_asset_id AND a.content_version = l.version
      WHERE ca.campaign_id = ?
      GROUP BY ca.id, ca.type, ca.title, l.version
      ORDER BY ca.created_at DESC
      `,
      [orgId, campaignId, orgId, orgId, campaignId]
    );
    return rows;
  },

  async campaignHasFullyApprovedAsset(orgId, campaignId) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM approvals a
      JOIN content_assets ca ON ca.id = a.content_asset_id AND ca.org_id = a.org_id
      WHERE a.org_id=? AND ca.campaign_id=?
        AND a.decision = 'approved'
        AND a.role IN ('legal','cmo')
      GROUP BY a.content_asset_id, a.content_version
      HAVING COUNT(DISTINCT a.role) = 2
      LIMIT 1
      `,
      [orgId, campaignId]
    );
    return rows.length > 0;
  },

  async getCampaignMetrics(orgId, campaignId, windowDays) {
    const [[evt]] = await pool.query(
      `
      SELECT COUNT(*) AS event_count
      FROM events
      WHERE org_id=? AND campaign_id=?
        AND occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
      [orgId, campaignId, windowDays]
    );

    const [[attr]] = await pool.query(
      `
      SELECT COALESCE(SUM(re.amount * ac.weight), 0) AS attributed_revenue
      FROM attribution_contributions ac
      JOIN attribution_results ar ON ar.id = ac.attribution_result_id AND ar.org_id = ac.org_id
      JOIN revenue_events re ON re.id = ar.revenue_event_id AND re.org_id = ar.org_id
      WHERE ac.org_id=? AND ac.campaign_id=?
        AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
      [orgId, campaignId, windowDays]
    );

    return {
      window_days: windowDays,
      event_count: Number(evt.event_count ?? 0),
      attributed_revenue: Number(attr.attributed_revenue ?? 0)
    };
  }
};
