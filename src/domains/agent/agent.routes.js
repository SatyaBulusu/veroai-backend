import express from "express";
import * as svc from "./agent.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.post("/actions/propose", async (req, res, next) => {
  try {
    const out = await svc.proposeAction(orgId(req), req.body, { user_id: req.user?.id, created_by: "ai" });
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.get("/actions", async (req, res, next) => {
  try {
    const out = await svc.listActions(orgId(req), req.query);
    res.json(out);
  } catch (e) { next(e); }
});

router.get("/actions/:actionId", async (req, res, next) => {
  try {
    const out = await svc.getAction(orgId(req), req.params.actionId);
    res.json(out);
  } catch (e) { next(e); }
});

router.post("/actions/:actionId/approve", async (req, res, next) => {
  try {
    const out = await svc.approveAction(orgId(req), req.params.actionId, { user_id: req.user?.id });
    res.json(out);
  } catch (e) { next(e); }
});

router.post("/actions/:actionId/reject", async (req, res, next) => {
  try {
    const out = await svc.rejectAction(orgId(req), req.params.actionId, { user_id: req.user?.id });
    res.json(out);
  } catch (e) { next(e); }
});

router.post("/actions/:actionId/execute", async (req, res, next) => {
  try {
    const out = await svc.executeAction(orgId(req), req.params.actionId);
    res.json(out);
  } catch (e) { next(e); }
});

export default router;
