import express from "express";
import * as repo from "./costs.repo.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.post("/ingest", async (req, res, next) => {
  try {
    const body = req.body || {};
    const items = body.items ?? body; // allow {items:[...]} or raw array/object
    const out = await repo.ingestCosts(orgId(req), items);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

export default router;
