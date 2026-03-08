import crypto from "crypto";

export function newId(prefix) {
  const rand = crypto.randomBytes(16).toString("hex").slice(0, 24);
  return (prefix + "_" + rand).slice(0, 26);
}

/**
 * Lightweight, dependency-free ID generator.
 * Format: <prefix>_<timebase36>_<randbase36>
 *
 * Example: exp_lm4f0m1x_3kz8p2h1q
 * Good enough for prototypes; can be swapped later with ULID/UUID libs
 * without changing callers.
 */
export function ulid(prefix = "id") {
  const time = Date.now().toString(36);
  const rand = crypto.randomBytes(8).toString("hex"); // 16 hex chars
  return `${prefix}_${time}_${rand}`;
}
