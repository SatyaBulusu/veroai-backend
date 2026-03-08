import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function insertAction(orgId, input) {
  const id = ulid("act");
  const {
    action_type,
    entity_type,
    entity_id = null,
    status = "proposed",
    risk_level = "low",
    requires_roles = null,
    proposal_json,
    created_by = "ai",
    created_by_id = null
  } = input;

  await db.query(
    `INSERT INTO agent_actions
      (id, org_id, action_type, entity_type, entity_id, status, risk_level, requires_roles, proposal_json, created_by, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      orgId,
      action_type,
      entity_type,
      entity_id,
      status,
      risk_level,
      requires_roles ? JSON.stringify(requires_roles) : null,
      JSON.stringify(proposal_json || {}),
      created_by,
      created_by_id
    ]
  );

  return getAction(orgId, id);
}

export async function getAction(orgId, actionId) {
  const [rows] = await db.query(
    `SELECT * FROM agent_actions WHERE org_id = ? AND id = ? LIMIT 1`,
    [orgId, actionId]
  );
  return rows[0] || null;
}

export async function listActions(orgId, { status, limit = 50, offset = 0 } = {}) {
  const where = ["org_id = ?"];
  const args = [orgId];

  if (status) { where.push("status = ?"); args.push(status); }

  const [rows] = await db.query(
    `SELECT * FROM agent_actions
     WHERE ${where.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [...args, Number(limit), Number(offset)]
  );

  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS total FROM agent_actions WHERE ${where.join(" AND ")}`,
    args
  );

  return { total: Number(cnt.total), limit: Number(limit), offset: Number(offset), items: rows };
}

export async function updateStatus(orgId, actionId, status, patch = {}) {
  const fields = ["status = ?"];
  const args = [status];

  if (patch.approved_by_id) {
    fields.push("approved_by_id = ?"); args.push(patch.approved_by_id);
    fields.push("approved_at = CURRENT_TIMESTAMP");
  }
  if (patch.executed) fields.push("executed_at = CURRENT_TIMESTAMP");
  if (patch.result_json) { fields.push("result_json = ?"); args.push(JSON.stringify(patch.result_json)); }

  args.push(orgId, actionId);

  await db.query(
    `UPDATE agent_actions SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE org_id = ? AND id = ?`,
    args
  );

  return getAction(orgId, actionId);
}
