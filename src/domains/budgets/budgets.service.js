import * as repo from "./budgets.repo.js";

export async function createBudget(orgId, input) {
  if (!input?.name) throw badRequest("name is required");
  if (!input?.start_date) throw badRequest("start_date is required (YYYY-MM-DD)");
  if (!input?.end_date) throw badRequest("end_date is required (YYYY-MM-DD)");
  return repo.createBudget(orgId, input);
}

export async function listBudgets(orgId, q) {
  return repo.listBudgets(orgId, q);
}

export async function getBudget(orgId, id) {
  const b = await repo.getBudget(orgId, id);
  if (!b) throw notFound("Budget not found");
  return b;
}

export async function upsertAllocation(orgId, budgetId, input) {
  if (!input?.scope_type) throw badRequest("scope_type is required (e.g., campaign, channel)");
  if (!input?.scope_id) throw badRequest("scope_id is required (campaign id or channel name)");
  return repo.upsertAllocation(orgId, budgetId, input);
}

export async function listAllocations(orgId, budgetId) {
  return repo.listAllocations(orgId, budgetId);
}

function badRequest(message) {
  const e = new Error(message);
  e.statusCode = 400;
  return e;
}
function notFound(message) {
  const e = new Error(message);
  e.statusCode = 404;
  return e;
}
