import crypto from "crypto";
import { pool } from "../config/db.js";

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function withIdempotency(req, routeKey, handler) {
  const key = req.header("X-Idempotency-Key");
  if (!key) return handler();

  const requestHash = sha256(JSON.stringify(req.body ?? {}));

  const [rows] = await pool.query(
    `SELECT response_code, response_body_json, request_hash
     FROM idempotency_keys
     WHERE idempotency_key=? AND route=?
     LIMIT 1`,
    [key, routeKey]
  );

  if (rows.length > 0) {
    const rec = rows[0];
    if (rec.request_hash !== requestHash) {
      return { status: 409, body: { error: "IdempotencyKeyConflict", message: "Same key used with different body." } };
    }
    const body = typeof rec.response_body_json === "string" ? JSON.parse(rec.response_body_json) : rec.response_body_json;
    return { status: rec.response_code, body };
  }

  const result = await handler();

  await pool.query(
    `INSERT INTO idempotency_keys (idempotency_key, route, request_hash, response_code, response_body_json)
     VALUES (?,?,?,?,?)`,
    [key, routeKey, requestHash, result.status, JSON.stringify(result.body)]
  );

  return result;
}
