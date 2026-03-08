import { pool } from "../../config/db.js";
import { newId } from "../../utils/id.js";

export const auditRepo = {
  async write({ orgId, actorType, actorId, action, entityType, entityId, metadata }) {
    await pool.query(
      `INSERT INTO audit_logs (id, org_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json)
       VALUES (?,?,?,?,?,?,?,?)`,
      [newId("audl"), orgId || "org_local", actorType, actorId, action, entityType, entityId, JSON.stringify(metadata ?? {})]
    );
  },

  async list(orgId, { action, entityType, actorType, startDate, endDate, limit = 20, offset = 0 } = {}) {
    if (!orgId) {
      throw new Error("orgId is required");
    }

    const where = ["org_id = ?"];
    const args = [orgId];

    if (action) {
      where.push("action = ?");
      args.push(action);
    }

    if (entityType) {
      where.push("entity_type = ?");
      args.push(entityType);
    }

    if (actorType) {
      where.push("actor_type = ?");
      args.push(actorType);
    }

    if (startDate) {
      where.push("created_at >= ?");
      args.push(startDate);
    }

    if (endDate) {
      where.push("created_at <= ?");
      args.push(endDate);
    }

    try {
      const [rows] = await pool.query(
        `SELECT 
          id,
          actor_type,
          actor_id,
          action,
          entity_type,
          entity_id,
          metadata_json,
          created_at
         FROM audit_logs
         WHERE ${where.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...args, Number(limit), Number(offset)]
      );

      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM audit_logs WHERE ${where.join(" AND ")}`,
        args
      );

      const total = countRows && countRows[0] ? Number(countRows[0].total) : 0;

      return {
        items: (rows || []).map(row => {
          try {
            return {
              id: row.id,
              actor_type: row.actor_type,
              actor_id: row.actor_id,
              action: row.action,
              entity_type: row.entity_type,
              entity_id: row.entity_id,
              metadata: typeof row.metadata_json === 'string' ? JSON.parse(row.metadata_json || "{}") : (row.metadata_json || {}),
              created_at: row.created_at
            };
          } catch (parseErr) {
            console.error("Error parsing metadata_json:", parseErr, row);
            return {
              id: row.id,
              actor_type: row.actor_type,
              actor_id: row.actor_id,
              action: row.action,
              entity_type: row.entity_type,
              entity_id: row.entity_id,
              metadata: {},
              created_at: row.created_at
            };
          }
        }),
        total,
        limit: Number(limit),
        offset: Number(offset)
      };
    } catch (err) {
      console.error("Database error in audit.repo.list:", err);
      console.error("Query params:", { orgId, where: where.join(" AND "), args, limit, offset });
      throw err;
    }
  },

  async getDistinctActions(orgId) {
    if (!orgId) {
      return [];
    }
    try {
      const [rows] = await pool.query(
        `SELECT DISTINCT action FROM audit_logs WHERE org_id = ? ORDER BY action ASC`,
        [orgId]
      );
      return (rows || []).map(r => r.action);
    } catch (err) {
      console.error("Database error in audit.repo.getDistinctActions:", err);
      return [];
    }
  },

  async getDistinctEntityTypes(orgId) {
    if (!orgId) {
      return [];
    }
    try {
      const [rows] = await pool.query(
        `SELECT DISTINCT entity_type FROM audit_logs WHERE org_id = ? ORDER BY entity_type ASC`,
        [orgId]
      );
      return (rows || []).map(r => r.entity_type);
    } catch (err) {
      console.error("Database error in audit.repo.getDistinctEntityTypes:", err);
      return [];
    }
  }
};
