import {
  createExperiment,
  listExperiments,
  getExperiment,
  addVariant,
  listVariants,
  listAssignments,
  getResults
} from "./experiments.repo.js";
import { assignVariant } from "./experiments.service.js";

function mustOrg(req) {
  const orgId = req.orgId || req.auth?.orgId;
  if (!orgId) {
    const err = new Error("Missing org context");
    err.statusCode = 400;
    throw err;
  }
  return orgId;
}

export async function createExperimentHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const exp = await createExperiment(orgId, req.body);
    res.status(201).json(exp);
  } catch (e) { next(e); }
}

export async function listExperimentsHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const out = await listExperiments(orgId, {
      campaign_id: req.query.campaign_id,
      status: req.query.status,
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json(out);
  } catch (e) { next(e); }
}

export async function getExperimentHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const exp = await getExperiment(orgId, req.params.id);
    if (!exp) return res.status(404).json({ error: "not_found" });
    res.json(exp);
  } catch (e) { next(e); }
}

export async function addVariantHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const exp = await getExperiment(orgId, req.params.id);
    if (!exp) return res.status(404).json({ error: "not_found" });
    const v = await addVariant(orgId, req.params.id, req.body);
    res.status(201).json(v);
  } catch (e) { next(e); }
}

export async function listVariantsHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const rows = await listVariants(orgId, req.params.id);
    res.json({ experiment_id: req.params.id, items: rows });
  } catch (e) { next(e); }
}

export async function assignHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const { profile_id } = req.body || {};
    if (!profile_id) return res.status(400).json({ error: "profile_id_required" });

    const asg = await assignVariant(orgId, req.params.id, profile_id);
    res.json(asg);
  } catch (e) { next(e); }
}

export async function listAssignmentsHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const rows = await listAssignments(orgId, req.params.id, {
      limit: req.query.limit,
      offset: req.query.offset
    });
    res.json({ experiment_id: req.params.id, items: rows });
  } catch (e) { next(e); }
}

export async function resultsHandler(req, res, next) {
  try {
    const orgId = mustOrg(req);
    const out = await getResults(orgId, req.params.id, {
      window_days: req.query.window_days
    });
    res.json(out);
  } catch (e) { next(e); }
}
