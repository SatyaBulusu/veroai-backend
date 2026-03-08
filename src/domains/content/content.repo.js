import { pool } from "../../config/db.js";

export const contentRepo = {
  async createAsset({ assetId, campaignId, type, format, title }) {
    await pool.query(
      `INSERT INTO content_assets (id, campaign_id, type, format, title) VALUES (?,?,?,?,?)`,
      [assetId, campaignId, type, format, title ?? null]
    );
  },

  async getAsset(assetId) {
    const [rows] = await pool.query(`SELECT * FROM content_assets WHERE id=?`, [assetId]);
    return rows[0] ?? null;
  },

  async getNextVersion(contentAssetId) {
    const [rows] = await pool.query(
      `SELECT COALESCE(MAX(version),0) AS v FROM content_asset_versions WHERE content_asset_id=?`,
      [contentAssetId]
    );
    return (rows[0]?.v ?? 0) + 1;
  },

  async insertVersion({ versionId, contentAssetId, version, content, generatedByType, model, runId, complianceScore }) {
    await pool.query(
      `INSERT INTO content_asset_versions
       (id, content_asset_id, version, content_json, generated_by_type, generated_by_model, generated_by_run_id, compliance_score)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        versionId,
        contentAssetId,
        version,
        JSON.stringify(content),
        generatedByType,
        model ?? null,
        runId ?? null,
        complianceScore ?? null
      ]
    );
  }
};
