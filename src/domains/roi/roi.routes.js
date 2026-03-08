import express from "express";
import * as svc from "./roi.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.auth?.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"] || "org_local";
}

router.get("/campaigns", async (req, res, next) => {
  try {
    const org = orgId(req);
    console.log('ROI by campaign request:', { org, query: req.query });
    const out = await svc.roiByCampaign(org, req.query);
    console.log('ROI by campaign response:', { org, window_days: out.window_days, model: out.model, items_count: out.items?.length || 0 });
    res.json(out);
  } catch (e) { next(e); }
});

router.get("/channels", async (req, res, next) => {
  try {
    const out = await svc.roiByChannel(orgId(req), req.query);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
