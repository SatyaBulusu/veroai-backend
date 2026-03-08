import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function clearInsights(orgId, windowDays) {
  await db.query(
    `DELETE FROM executive_insights WHERE org_id = ? AND window_days = ?`,
    [orgId, Number(windowDays)]
  );
}

export async function insertInsights(orgId, windowDays, insights) {
  const items = [];
  for (const ins of insights) {
    const id = ulid("ins");
    await db.query(
      `INSERT INTO executive_insights
       (id, org_id, window_days, insight_type, severity, entity_type, entity_id, title, facts_json, recommendation_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orgId,
        Number(windowDays),
        ins.insight_type,
        ins.severity,
        ins.entity_type,
        ins.entity_id ?? null,
        ins.title,
        JSON.stringify(ins.facts ?? {}),
        ins.recommendation ? JSON.stringify(ins.recommendation) : null
      ]
    );
    items.push({ id, ...ins });
  }
  return items;
}

export async function listInsights(orgId, windowDays, { type, severity, limit = 50, offset = 0 } = {}) {
  const where = ["org_id = ?", "window_days = ?"];
  const args = [orgId, Number(windowDays)];

  if (type) { where.push("insight_type = ?"); args.push(type); }
  if (severity) { where.push("severity = ?"); args.push(severity); }

  const [rows] = await db.query(
    `SELECT * FROM executive_insights
     WHERE ${where.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...args, Number(limit), Number(offset)]
  );

  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM executive_insights
     WHERE ${where.join(" AND ")}`,
    args
  );

  return { total: Number(cnt.total), limit: Number(limit), offset: Number(offset), items: rows };
}

export async function upsertNarrative(orgId, windowDays, audience, narrative_md, sources) {
  const id = ulid("nar");
  await db.query(
    `INSERT INTO executive_narratives
      (id, org_id, window_days, audience, narrative_md, sources_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, orgId, Number(windowDays), audience, narrative_md, JSON.stringify(sources ?? {})]
  );
  return { id, org_id: orgId, window_days: Number(windowDays), audience, narrative_md, sources_json: sources };
}

export async function getLatestNarrative(orgId, windowDays, audience) {
  const [rows] = await db.query(
    `SELECT *
     FROM executive_narratives
     WHERE org_id = ? AND window_days = ? AND audience = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [orgId, Number(windowDays), audience]
  );
  return rows[0] || null;
}
