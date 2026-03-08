import { pool } from "../../config/db.js";

export const profileRepo = {
  async findByIdentifier(idType, idValue) {
    const [rows] = await pool.query(
      `SELECT p.id
       FROM profile_identifiers pi
       JOIN profiles p ON p.id = pi.profile_id
       WHERE pi.id_type=? AND pi.id_value=? LIMIT 1`,
      [idType, idValue]
    );
    return rows[0]?.id ?? null;
  },

  async insertProfile(profileId, type, lifecycleStage = null) {
    await pool.query(
      `INSERT INTO profiles (id, type, lifecycle_stage) VALUES (?,?,?)`,
      [profileId, type, lifecycleStage]
    );
  },

  async updateLifecycle(profileId, lifecycleStage) {
    await pool.query(`UPDATE profiles SET lifecycle_stage=? WHERE id=?`, [lifecycleStage, profileId]);
  },

  async insertIdentifier(profileId, idType, idValue) {
    await pool.query(
      `INSERT IGNORE INTO profile_identifiers (profile_id, id_type, id_value) VALUES (?,?,?)`,
      [profileId, idType, idValue]
    );
  },

  async upsertAttribute(profileId, key, value) {
    await pool.query(
      `INSERT INTO profile_attributes (profile_id, attr_key, attr_value)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE attr_value=VALUES(attr_value)`,
      [profileId, key, String(value)]
    );
  }
};
