import { pool } from "../../config/db.js";

export const attributionRepo = {
  async createRun({ id, revenueEventId, model, windowDays }) {
    await pool.query(
      `INSERT INTO attribution_runs (id, status, model, window_days, revenue_event_id)
       VALUES (?, 'queued', ?, ?, ?)`,
      [id, model, windowDays, revenueEventId]
    );
  },

  async setRunStatus(id, status, errorMessage = null) {
    await pool.query(
      `UPDATE attribution_runs SET status=?, error_message=? WHERE id=?`,
      [status, errorMessage, id]
    );
  },

  async insertResult({ id, runId, revenueEventId, model, confidenceScore, signals }) {
    await pool.query(
      `INSERT INTO attribution_results (id, attribution_run_id, revenue_event_id, model, confidence_score, signals_json)
       VALUES (?,?,?,?,?,?)`,
      [id, runId, revenueEventId, model, confidenceScore, JSON.stringify(signals)]
    );
  },

  async insertContribution({ resultId, campaignId, weight }) {
    await pool.query(
      `INSERT INTO attribution_contributions (attribution_result_id, campaign_id, weight)
       VALUES (?,?,?)`,
      [resultId, campaignId, weight]
    );
  },

  async getResultByRevenueEventId(revenueEventId) {
    const [rows] = await pool.query(
      `SELECT * FROM attribution_results WHERE revenue_event_id=? ORDER BY created_at DESC LIMIT 1`,
      [revenueEventId]
    );
    return rows[0] ?? null;
  },

  async getContributions(resultId) {
    const [rows] = await pool.query(
      `SELECT campaign_id, weight FROM attribution_contributions WHERE attribution_result_id=? ORDER BY weight DESC`,
      [resultId]
    );
    return rows;
  }
};
