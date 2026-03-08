import express from "express";
import * as svc from "./ai_assets.service.js";

const router = express.Router({ mergeParams: true });

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.get("/", async (req, res, next) => {
  try {
    const out = await svc.listCampaignAssets(orgId(req), req.params.campaignId, req.query);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
