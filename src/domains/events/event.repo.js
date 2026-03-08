import { pool } from "../../config/db.js";

export const eventRepo = {
  async insertEvent({ id, clientEventId, profileId, name, occurredAt, properties, campaignId }) {
    await pool.query(
      `INSERT INTO events (id, client_event_id, profile_id, name, occurred_at, properties_json, campaign_id)
       VALUES (?,?,?,?,?,?,?)`,
      [id, clientEventId ?? null, profileId, name, occurredAt, JSON.stringify(properties), campaignId ?? null]
    );
  }
};
