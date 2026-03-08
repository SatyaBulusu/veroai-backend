import { pool } from "../../config/db.js";

export const approvalRepo = {
  async insertApproval({ id, contentAssetId, contentVersion, role, decision, comments, actorType, actorId }) {
    await pool.query(
      `INSERT INTO approvals
       (id, content_asset_id, content_version, role, decision, comments, actor_type, actor_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, contentAssetId, contentVersion, role, decision, comments ?? null, actorType, actorId]
    );
  },

  async hasFullyApprovedAssetForCampaign(campaignId) {
    const [rows] = await pool.query(
      `
      SELECT 1
      FROM approvals a
      JOIN content_assets ca ON ca.id = a.content_asset_id
      WHERE ca.campaign_id = ?
        AND a.decision = 'approved'
        AND a.role IN ('legal','cmo')
      GROUP BY a.content_asset_id, a.content_version
      HAVING COUNT(DISTINCT a.role) = 2
      LIMIT 1
      `,
      [campaignId]
    );
    return rows.length > 0;
  },

  async listPendingAIAssets(orgId, { campaign_id } = {}) {
    let query = `
      SELECT 
        aa.id,
        aa.id AS ai_asset_id,
        aa.campaign_id,
        aa.asset_type,
        aa.channel,
        aa.tone,
        aa.content_text,
        aa.status,
        aa.source,
        aa.version,
        aa.created_at,
        c.name AS campaign_name
      FROM ai_assets aa
      LEFT JOIN campaigns c ON c.id = aa.campaign_id AND c.org_id = aa.org_id
      WHERE aa.org_id = ? 
        AND aa.status NOT IN ('approved', 'rejected')
        AND aa.status IS NOT NULL
    `;
    const params = [orgId];

    if (campaign_id) {
      query += ` AND aa.campaign_id = ?`;
      params.push(campaign_id);
    }

    query += ` ORDER BY aa.created_at DESC LIMIT 100`;

    const [rows] = await pool.query(query, params);
    return rows;
  },

  async getApprovalStatusForContentAsset(orgId, contentAssetId, contentVersion) {
    const [rows] = await pool.query(
      `
      SELECT 
        role,
        decision,
        comments,
        actor_type,
        actor_id,
        created_at
      FROM approvals
      WHERE content_asset_id = ? AND content_version = ?
      ORDER BY created_at DESC
      `,
      [contentAssetId, contentVersion]
    );
    return rows;
  },

  async getApprovalStatusForAIAsset(orgId, aiAssetId) {
    // Find the Content Asset(s) created from this AI Asset and get their approval status
    // The ai_asset_id is stored in content_json.ai_asset_id
    const [rows] = await pool.query(
      `
      SELECT 
        a.role,
        a.decision,
        a.comments,
        a.actor_type,
        a.actor_id,
        a.created_at,
        ca.id AS content_asset_id,
        a.content_version
      FROM approvals a
      JOIN content_asset_versions cav ON cav.content_asset_id = a.content_asset_id AND cav.version = a.content_version
      JOIN content_assets ca ON ca.id = a.content_asset_id
      WHERE ca.org_id = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(cav.content_json, '$.ai_asset_id')) = ?
      ORDER BY a.created_at DESC
      `,
      [orgId, aiAssetId]
    );
    return rows;
  }
};
