import express from "express";
import * as svc from "./executive.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.get("/summary", async (req, res, next) => {
  try {
    const out = await svc.getSummary(orgId(req), req.query);
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
