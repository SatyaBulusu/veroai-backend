import express from "express";
import * as svc from "./roi.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.get("/campaigns", async (req, res, next) => {
  try {
    const out = await svc.roiByCampaign(orgId(req), req.query);
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
