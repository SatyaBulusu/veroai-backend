import express from "express";
import * as svc from "./experiment_assets.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.post("/generate-variants", async (req, res, next) => {
  try {
    const out = await svc.generateVariantsAndLink(orgId(req), req.body, { user_id: req.user?.id });
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.post("/link", async (req, res, next) => {
  try {
    const out = await svc.linkExistingAsset(orgId(req), req.body);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.get("/:experimentId/assets", async (req, res, next) => {
  try {
    const out = await svc.listExperimentAssets(orgId(req), req.params.experimentId);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
