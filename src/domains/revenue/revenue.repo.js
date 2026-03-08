import { pool } from "../../config/db.js";

export const revenueRepo = {
  async insertRevenueEvent({ id, externalId, source, profileId, amount, currency, occurredAt, properties }) {
    await pool.query(
      `INSERT INTO revenue_events (id, external_id, source, profile_id, amount, currency, occurred_at, properties_json)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, externalId ?? null, source, profileId, amount, currency, occurredAt, JSON.stringify(properties)]
    );
  },

  async existsByExternal(source, externalId) {
    if (!externalId) return false;
    const [rows] = await pool.query(
      `SELECT 1 FROM revenue_events WHERE source=? AND external_id=? LIMIT 1`,
      [source, externalId]
    );
    return rows.length > 0;
  },

  async getRevenueEvent(revenueEventId) {
    const [rows] = await pool.query(`SELECT * FROM revenue_events WHERE id=?`, [revenueEventId]);
    return rows[0] ?? null;
  }
};
