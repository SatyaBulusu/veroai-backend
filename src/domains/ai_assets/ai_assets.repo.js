import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function insertAsset(orgId, input) {
  const id = input.id || ulid("asset");
  const {
    campaign_id,
    asset_type,
    channel,
    tone,
    persona = null,
    inputs = null,
    content_text,
    status = "draft",
    source = "ai",
    version = 1,
    created_by = null,
  } = input;

  await db.query(
    `INSERT INTO ai_assets
      (id, org_id, campaign_id, asset_type, channel, tone, persona_json, inputs_json, content_text, status, source, version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      campaign_id,
      asset_type,
      channel,
      tone,
      persona ? JSON.stringify(persona) : null,
      inputs ? JSON.stringify(inputs) : null,
      content_text,
      status,
      source,
      Number(version),
      created_by
    ]
  );

  return getAsset(orgId, id);
}

export async function getAsset(orgId, assetId) {
  const [rows] = await db.query(
    `SELECT * FROM ai_assets WHERE org_id = ? AND id = ? LIMIT 1`,
    [orgId, assetId]
  );
  return rows[0] || null;
}

export async function listAssetsByCampaign(orgId, campaignId, { limit = 50, offset = 0 } = {}) {
  const [rows] = await db.query(
    `SELECT * FROM ai_assets
     WHERE org_id = ? AND campaign_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [orgId, campaignId, Number(limit), Number(offset)]
  );
  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS total FROM ai_assets WHERE org_id = ? AND campaign_id = ?`,
    [orgId, campaignId]
  );
  return { total: Number(cnt.total), limit: Number(limit), offset: Number(offset), items: rows };
}

export async function updateStatus(orgId, assetId, status) {
  await db.query(
    `UPDATE ai_assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE org_id = ? AND id = ?`,
    [status, orgId, assetId]
  );
  return getAsset(orgId, assetId);
}

export async function insertValidation(orgId, assetId, validation) {
  const id = ulid("aval");
  await db.query(
    `INSERT INTO ai_asset_validations (id, org_id, asset_id, passed, risk_level, reasons_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, orgId, assetId, validation.passed ? 1 : 0, validation.risk_level, JSON.stringify(validation.reasons || [])]
  );
  return { id, ...validation };
}

export async function getLatestValidation(orgId, assetId) {
  const [rows] = await db.query(
    `SELECT * FROM ai_asset_validations
     WHERE org_id = ? AND asset_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [orgId, assetId]
  );
  return rows[0] || null;
}
