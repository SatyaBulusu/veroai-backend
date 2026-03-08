import crypto from "crypto";
import { getOrCreateAssignment } from "./experiments.repo.js";

export async function assignVariant(orgId, experimentId, profileId) {
  const chooser = (variants) => {
    const seed = `${orgId}:${experimentId}:${profileId}`;
    const hash = crypto.createHash("sha256").update(seed).digest("hex");
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;

    const normalized = variants.map(v => ({
      id: v.id,
      traffic_pct: Number(v.traffic_pct || 0)
    }));

    let acc = 0;
    for (const v of normalized) {
      acc += v.traffic_pct;
      if (bucket < acc) return v.id;
    }
    return normalized[normalized.length - 1].id;
  };

  return getOrCreateAssignment(orgId, experimentId, profileId, chooser);
}
