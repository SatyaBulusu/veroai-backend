import express from "express";
import * as svc from "./budgets.service.js";

const router = express.Router();

function orgId(req) {
  return req.orgId || req.headers["x-org-id"] || req.headers["x-orgid"] || req.headers["x_org_id"];
}

router.post("/", async (req, res, next) => {
  try {
    const out = await svc.createBudget(orgId(req), req.body);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.get("/", async (req, res, next) => {
  try {
    const out = await svc.listBudgets(orgId(req), req.query);
    res.json(out);
  } catch (e) { next(e); }
});

router.get("/:budgetId", async (req, res, next) => {
  try {
    const out = await svc.getBudget(orgId(req), req.params.budgetId);
    res.json(out);
  } catch (e) { next(e); }
});

router.post("/:budgetId/allocations", async (req, res, next) => {
  try {
    const out = await svc.upsertAllocation(orgId(req), req.params.budgetId, req.body);
    res.status(201).json(out);
  } catch (e) { next(e); }
});

router.get("/:budgetId/allocations", async (req, res, next) => {
  try {
    const out = await svc.listAllocations(orgId(req), req.params.budgetId);
    res.json({ items: out });
  } catch (e) { next(e); }
});

export default router;
