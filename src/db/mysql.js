import mysql from "mysql2/promise";
import { env } from "../config/env.js";

/**
 * Single MySQL pool for now.
 * Later: can be replaced with org-aware pool routing (shards / whales).
 */
export const db = mysql.createPool({
  host: env.DB_HOST || "127.0.0.1",
  port: env.DB_PORT ? Number(env.DB_PORT) : 3306,
  user: env.DB_USER || "app",
  password: env.DB_PASSWORD || "app_pw",
  database: env.DB_NAME || "veroai",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
