import * as repo from "./agent.repo.js";
import { evaluateGuardrails } from "./guardrails.js";
import { MockConnector } from "./connectors/mock.connector.js";

const connector = new MockConnector();

export async function proposeAction(orgId, body = {}, ctx = {}) {
  const required = ["action_type", "entity_type", "proposal"];
  for (const k of required) {
    if (!body?.[k]) throw badRequest(`${k} is required`);
  }

  const proposal = normalizeProposal(body);
  const guard = evaluateGuardrails(proposal);

  const action = await repo.insertAction(orgId, {
    action_type: proposal.action_type,
    entity_type: proposal.entity_type,
    entity_id: proposal.entity_id || null,
    status: guard.status,
    risk_level: guard.risk_level || proposal.risk_level || "low",
    requires_roles: proposal.requires_roles || null,
    proposal_json: { ...proposal, guardrails: { allowed: guard.allowed, reasons: guard.reasons || [] } },
    created_by: ctx.created_by || "ai",
    created_by_id: ctx.user_id || null
  });

  return action;
}

export async function approveAction(orgId, actionId, ctx = {}) {
  const a = await repo.getAction(orgId, actionId);
  if (!a) throw notFound("Action not found");
  if (a.status !== "needs_approval") throw conflict(`Cannot approve from status ${a.status}`);
  return repo.updateStatus(orgId, actionId, "approved", { approved_by_id: ctx.user_id || "unknown" });
}

export async function rejectAction(orgId, actionId, ctx = {}) {
  const a = await repo.getAction(orgId, actionId);
  if (!a) throw notFound("Action not found");
  if (!["needs_approval", "approved"].includes(a.status)) throw conflict(`Cannot reject from status ${a.status}`);
  return repo.updateStatus(orgId, actionId, "rejected", { approved_by_id: ctx.user_id || "unknown" });
}

export async function executeAction(orgId, actionId) {
  const a = await repo.getAction(orgId, actionId);
  if (!a) throw notFound("Action not found");
  if (a.status !== "approved") throw conflict(`Cannot execute from status ${a.status}`);

  try {
    const result = await connector.execute({
      id: a.id,
      action_type: a.action_type,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      proposal: safeJson(a.proposal_json)
    });
    return repo.updateStatus(orgId, actionId, "executed", { executed: true, result_json: result });
  } catch (e) {
    return repo.updateStatus(orgId, actionId, "failed", { executed: true, result_json: { ok: false, error: String(e?.message || e) } });
  }
}

export async function listActions(orgId, q = {}) {
  return repo.listActions(orgId, q);
}

export async function getAction(orgId, actionId) {
  const a = await repo.getAction(orgId, actionId);
  if (!a) throw notFound("Action not found");
  return a;
}

function normalizeProposal(body) {
  const p = body.proposal || {};
  return {
    action_type: body.action_type,
    entity_type: body.entity_type,
    entity_id: body.entity_id || null,
    risk_level: p.risk_level || body.risk_level || "low",
    requires_roles: p.requires_roles || body.requires_roles || null,
    reason: p.reason || null,
    facts: p.facts || {},
    params: p.params || {}
  };
}

function safeJson(x) {
  try { return typeof x === "string" ? JSON.parse(x) : (x || {}); } catch { return {}; }
}

function badRequest(message) { const e = new Error(message); e.statusCode = 400; return e; }
function notFound(message) { const e = new Error(message); e.statusCode = 404; return e; }
function conflict(message) { const e = new Error(message); e.statusCode = 409; return e; }
