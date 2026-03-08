import { pool } from "../../config/db.js";

export const authRepo = {
  async findActiveApiKey(apiKey) {
    const [rows] = await pool.query(
      `
      SELECT
        ak.id AS api_key_id,
        ak.api_key,
        ak.org_id,
        ak.user_id,
        ak.name AS api_key_name,
        u.email AS user_email,
        u.display_name AS user_display_name,
        o.name AS org_name
      FROM api_keys ak
      JOIN users u ON u.id = ak.user_id
      JOIN orgs o ON o.id = ak.org_id
      WHERE ak.api_key=? AND ak.is_active=1
      LIMIT 1
      `,
      [apiKey]
    );
    return rows[0] ?? null;
  },

  async getUserRoles(orgId, userId) {
    const [rows] = await pool.query(
      `SELECT role FROM user_roles WHERE org_id=? AND user_id=?`,
      [orgId, userId]
    );
    return rows.map(r => r.role);
  }
};
