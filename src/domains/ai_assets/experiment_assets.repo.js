import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function linkAssetToVariant(orgId, { experiment_id, variant_id, asset_id, slot }) {
  const id = ulid("eav");
  await db.query(
    `INSERT INTO experiment_asset_variants (id, org_id, experiment_id, variant_id, asset_id, slot)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE asset_id = VALUES(asset_id)`,
    [id, orgId, experiment_id, variant_id, asset_id, slot]
  );
  return { id, org_id: orgId, experiment_id, variant_id, asset_id, slot };
}

export async function listExperimentAssets(orgId, experimentId) {
  const [rows] = await db.query(
    `SELECT
        eav.experiment_id,
        eav.variant_id,
        v.name AS variant_name,
        v.is_control,
        eav.slot,
        a.id AS asset_id,
        a.asset_type,
        a.channel,
        a.tone,
        a.status,
        a.content_text,
        a.created_at AS asset_created_at
     FROM experiment_asset_variants eav
     JOIN experiment_variants v
       ON v.org_id = eav.org_id AND v.id = eav.variant_id
     JOIN ai_assets a
       ON a.org_id = eav.org_id AND a.id = eav.asset_id
     WHERE eav.org_id = ? AND eav.experiment_id = ?
     ORDER BY v.is_control DESC, v.name ASC, eav.slot ASC, a.created_at DESC`,
    [orgId, experimentId]
  );

  const variants = new Map();
  for (const r of rows) {
    if (!variants.has(r.variant_id)) {
      variants.set(r.variant_id, {
        variant_id: r.variant_id,
        name: r.variant_name,
        is_control: !!r.is_control,
        slots: {}
      });
    }
    variants.get(r.variant_id).slots[r.slot] = {
      asset_id: r.asset_id,
      asset_type: r.asset_type,
      channel: r.channel,
      tone: r.tone,
      status: r.status,
      content_text: r.content_text,
      created_at: r.asset_created_at
    };
  }

  return { experiment_id: experimentId, variants: Array.from(variants.values()) };
}
