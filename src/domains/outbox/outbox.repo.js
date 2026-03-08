import { pool } from "../../config/db.js";
import { newId } from "../../utils/id.js";

export const outboxRepo = {
  async enqueue({ orgId, eventType, entityType, entityId, payload }) {
    await pool.query(
      `INSERT INTO outbox_events (id, org_id, event_type, entity_type, entity_id, payload_json, status)
       VALUES (?,?,?,?,?,?, 'pending')`,
      [newId("obox"), orgId || "org_local", eventType, entityType, entityId, JSON.stringify(payload ?? {})]
    );
  }
};
