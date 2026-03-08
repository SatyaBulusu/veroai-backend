import express from "express";
import * as svc from "./executive.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.auth?.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";
}

router.get("/summary", async (req, res, next) => {
  try {
    const org = orgId(req);
    console.log('Executive summary request:', { org, query: req.query });
    const out = await svc.getSummary(org, req.query);
    console.log('Executive summary response:', { org, window_days: out.window_days, model: out.model, kpis: out.kpis });
    res.json(out);
  } catch (e) { next(e); }
});

router.post("/insights/generate", async (req, res, next) => {
  try {
    const out = await svc.generateInsights(orgId(req), req.body);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.get("/insights", async (req, res, next) => {
  try {
    const out = await svc.listInsights(orgId(req), req.query);
    res.json(out);
  } catch (e) { next(e); }
});

router.post("/narrative", async (req, res, next) => {
  try {
    const out = await svc.generateNarrative(orgId(req), req.body);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.get("/narrative", async (req, res, next) => {
  try {
    const out = await svc.getLatestNarrative(orgId(req), req.query);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
