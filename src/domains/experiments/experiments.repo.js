import { db } from "../../db/mysql.js";
import { ulid } from "../../utils/id.js";

export async function createExperiment(orgId, input) {
  const id = input.id || ulid("exp");
  const {
    campaign_id = null,
    name,
    hypothesis = null,
    status = "draft",
    primary_metric = null,
    success_event_type = null,
    start_at = null,
    end_at = null
  } = input;

  await db.query(
    `INSERT INTO experiments
      (id, org_id, campaign_id, name, hypothesis, status, primary_metric, success_event_type, start_at, end_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, orgId, campaign_id, name, hypothesis, status, primary_metric, success_event_type, start_at, end_at]
  );

  return getExperiment(orgId, id);
}

export async function listExperiments(orgId, { campaign_id, status, limit = 50, offset = 0 } = {}) {
  const where = ["org_id = ?"];
  const args = [orgId];

  if (campaign_id) { where.push("campaign_id = ?"); args.push(campaign_id); }
  if (status) { where.push("status = ?"); args.push(status); }

  const [rows] = await db.query(
    `SELECT * FROM experiments
     WHERE ${where.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    [...args, Number(limit), Number(offset)]
  );

  const [[cnt]] = await db.query(
    `SELECT COUNT(*) AS total FROM experiments WHERE ${where.join(" AND ")}`,
    args
  );

  return { total: Number(cnt.total), limit: Number(limit), offset: Number(offset), items: rows };
}

export async function getExperiment(orgId, experimentId) {
  const [rows] = await db.query(
    `SELECT * FROM experiments WHERE org_id = ? AND id = ? LIMIT 1`,
    [orgId, experimentId]
  );
  return rows[0] || null;
}

export async function addVariant(orgId, experimentId, input) {
  const id = input.id || ulid("var");
  const { name, traffic_pct = 50, payload_json = null, is_control = 0 } = input;

  await db.query(
    `INSERT INTO experiment_variants
      (id, org_id, experiment_id, name, traffic_pct, payload_json, is_control)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, orgId, experimentId, name, Number(traffic_pct), payload_json ? JSON.stringify(payload_json) : null, is_control ? 1 : 0]
  );

  return getVariant(orgId, id);
}

export async function listVariants(orgId, experimentId) {
  const [rows] = await db.query(
    `SELECT * FROM experiment_variants WHERE org_id = ? AND experiment_id = ? ORDER BY is_control DESC, name ASC`,
    [orgId, experimentId]
  );
  return rows;
}

export async function getVariant(orgId, variantId) {
  const [rows] = await db.query(
    `SELECT * FROM experiment_variants WHERE org_id = ? AND id = ? LIMIT 1`,
    [orgId, variantId]
  );
  return rows[0] || null;
}

export async function getOrCreateAssignment(orgId, experimentId, profileId, chooser) {
  const [existing] = await db.query(
    `SELECT * FROM experiment_assignments WHERE org_id = ? AND experiment_id = ? AND profile_id = ? LIMIT 1`,
    [orgId, experimentId, profileId]
  );
  if (existing[0]) return existing[0];

  const variants = await listVariants(orgId, experimentId);
  if (!variants.length) {
    const err = new Error("No variants configured for experiment");
    err.statusCode = 400;
    throw err;
  }

  const variantId = chooser(variants);

  const id = ulid("asg");
  await db.query(
    `INSERT INTO experiment_assignments
      (id, org_id, experiment_id, variant_id, profile_id, assign_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, orgId, experimentId, variantId, profileId, `profile:${profileId}`]
  );

  const [rows] = await db.query(
    `SELECT * FROM experiment_assignments WHERE org_id = ? AND id = ? LIMIT 1`,
    [orgId, id]
  );
  return rows[0];
}

export async function listAssignments(orgId, experimentId, { limit = 100, offset = 0 } = {}) {
  const [rows] = await db.query(
    `SELECT * FROM experiment_assignments
     WHERE org_id = ? AND experiment_id = ?
     ORDER BY assigned_at DESC
     LIMIT ? OFFSET ?`,
    [orgId, experimentId, Number(limit), Number(offset)]
  );
  return rows;
}

async function tableExists(tableName) {
  const [rows] = await db.query(
    `SELECT 1 AS ok
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?
     LIMIT 1`,
    [tableName]
  );
  return !!rows[0];
}

async function findAttributionResultsTable() {
  const candidates = ["attribution_results", "attribution_result"];
  for (const t of candidates) {
    if (await tableExists(t)) return t;
  }
  const [rows] = await db.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name LIKE 'attribution_result%'
     ORDER BY table_name ASC
     LIMIT 1`,
    []
  );
  return rows[0]?.table_name || null;
}

async function columnExists(tableName, colName) {
  const [rows] = await db.query(
    `SELECT 1 AS ok
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?
     LIMIT 1`,
    [tableName, colName]
  );
  return !!rows[0];
}

async function getResultsV1(orgId, experimentId, days, counts) {
  const [rev] = await db.query(
    `SELECT a.variant_id,
            SUM(re.amount) AS revenue_sum,
            COUNT(re.id) AS revenue_events
     FROM experiment_assignments a
     JOIN revenue_events re
       ON re.org_id = a.org_id AND re.profile_id = a.profile_id
     WHERE a.org_id = ? AND a.experiment_id = ?
       AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       AND re.occurred_at >= a.assigned_at
     GROUP BY a.variant_id`,
    [orgId, experimentId, days]
  );

  const revenueByVariant = Object.fromEntries(rev.map(r => [r.variant_id, {
    revenue_sum: Number(r.revenue_sum || 0),
    revenue_events: Number(r.revenue_events || 0)
  }]));

  return counts.map(c => ({
    variant_id: c.variant_id,
    name: c.name,
    is_control: !!c.is_control,
    assigned_count: Number(c.assigned_count || 0),
    revenue_sum: revenueByVariant[c.variant_id]?.revenue_sum || 0,
    revenue_events: revenueByVariant[c.variant_id]?.revenue_events || 0
  }));
}

export async function getResults(orgId, experimentId, { window_days = 30 } = {}) {
  const days = Number(window_days) || 30;

  const [counts] = await db.query(
    `SELECT v.id AS variant_id, v.name, v.is_control,
            COUNT(a.id) AS assigned_count
     FROM experiment_variants v
     LEFT JOIN experiment_assignments a
       ON a.org_id = v.org_id AND a.variant_id = v.id AND a.experiment_id = v.experiment_id
     WHERE v.org_id = ? AND v.experiment_id = ?
     GROUP BY v.id, v.name, v.is_control
     ORDER BY v.is_control DESC, v.name ASC`,
    [orgId, experimentId]
  );

  const hasAttr = await tableExists("attribution_contributions");
  const exp = await getExperiment(orgId, experimentId);

  if (!hasAttr || !exp?.campaign_id) {
    return {
      experiment_id: experimentId,
      window_days: days,
      variants: await getResultsV1(orgId, experimentId, days, counts),
      mode: "results_v1_fallback",
      disclaimer: !hasAttr
        ? "attribution_contributions table not found; showing naive revenue_events after assignment."
        : "experiment has no campaign_id; showing naive revenue_events after assignment."
    };
  }

  const arTable = await findAttributionResultsTable();
  if (!arTable) {
    return {
      experiment_id: experimentId,
      window_days: days,
      variants: await getResultsV1(orgId, experimentId, days, counts),
      mode: "results_v1_fallback",
      disclaimer: "No attribution_results table found to link contributions to revenue_events; showing naive revenue_events after assignment."
    };
  }

  if (!(await columnExists(arTable, "revenue_event_id"))) {
    return {
      experiment_id: experimentId,
      window_days: days,
      variants: await getResultsV1(orgId, experimentId, days, counts),
      mode: "results_v1_fallback",
      disclaimer: `Found ${arTable} but missing revenue_event_id column; showing naive revenue_events after assignment.`
    };
  }

  if (!(await columnExists("attribution_contributions", "weight"))) {
    return {
      experiment_id: experimentId,
      window_days: days,
      variants: await getResultsV1(orgId, experimentId, days, counts),
      mode: "results_v1_fallback",
      disclaimer: "attribution_contributions missing weight; showing naive revenue_events after assignment."
    };
  }

  const [attr] = await db.query(
    `SELECT a.variant_id,
            SUM(re.amount * ac.weight) AS attributed_revenue_sum,
            COUNT(DISTINCT re.id) AS contribution_events
     FROM experiment_assignments a
     JOIN revenue_events re
       ON re.org_id = a.org_id AND re.profile_id = a.profile_id
     JOIN \`${arTable}\` ar
       ON ar.org_id = a.org_id AND ar.revenue_event_id = re.id
     JOIN attribution_contributions ac
       ON ac.org_id = a.org_id
      AND ac.attribution_result_id = ar.id
      AND ac.campaign_id = ?
     WHERE a.org_id = ? AND a.experiment_id = ?
       AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       AND re.occurred_at >= a.assigned_at
     GROUP BY a.variant_id`,
    [exp.campaign_id, orgId, experimentId, days]
  );

  const byVariant = Object.fromEntries(attr.map(r => [r.variant_id, {
    attributed_revenue_sum: Number(r.attributed_revenue_sum || 0),
    contribution_events: Number(r.contribution_events || 0)
  }]));

  const variants = counts.map(c => ({
    variant_id: c.variant_id,
    name: c.name,
    is_control: !!c.is_control,
    assigned_count: Number(c.assigned_count || 0),
    attributed_revenue_sum: byVariant[c.variant_id]?.attributed_revenue_sum || 0,
    contribution_events: byVariant[c.variant_id]?.contribution_events || 0
  }));

  const control = variants.find(v => v.is_control) || variants[0];
  const controlDen = Math.max(1, Number(control?.assigned_count || 0));
  const controlRate = Number(control?.attributed_revenue_sum || 0) / controlDen;

  const variants_with_lift = variants.map(v => {
    const den = Math.max(1, Number(v.assigned_count || 0));
    const rate = Number(v.attributed_revenue_sum || 0) / den;
    return {
      ...v,
      attributed_revenue_per_assigned: rate,
      lift_vs_control: controlRate ? (rate - controlRate) / controlRate : null
    };
  });

  return {
    experiment_id: experimentId,
    campaign_id: exp.campaign_id,
    window_days: days,
    mode: "results_v2_attribution_weight",
    attribution_results_table: arTable,
    control_variant_id: control?.variant_id,
    variants: variants_with_lift
  };
}
