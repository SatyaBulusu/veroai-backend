import express from "express";
import * as svc from "./ai_assets.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.post("/generate", async (req, res, next) => {
  try {
    const out = await svc.generateAsset(orgId(req), req.body, { user_id: req.user?.id });
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.post("/validate", async (req, res, next) => {
  try {
    const out = await svc.validateOnly(orgId(req), req.body);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
