import { MockProvider } from "./providers/mock.provider.js";
import * as repo from "./ai_assets.repo.js";
import { validateAsset } from "./guardrails.js";

const provider = new MockProvider();

export async function generateAsset(orgId, body = {}, ctx = {}) {
  const required = ["campaign_id", "asset_type", "channel", "tone"];
  for (const k of required) {
    if (!body?.[k]) throw badRequest(`${k} is required`);
  }

  const persona = body.persona || null;
  const constraints = body.constraints || {};
  const inputs = body.inputs || {};

  const gen = await provider.generate({
    asset_type: body.asset_type,
    channel: body.channel,
    tone: body.tone,
    persona,
    constraints,
    inputs
  });

  const validation = validateAsset({
    channel: body.channel,
    tone: body.tone,
    content_text: gen.content_text,
    rules: body.guardrails || {}
  });

  let status = body.status || "needs_approval";
  if (!validation.passed && validation.risk_level === "high") status = "rejected";

  const asset = await repo.insertAsset(orgId, {
    campaign_id: body.campaign_id,
    asset_type: body.asset_type,
    channel: body.channel,
    tone: body.tone,
    persona,
    inputs,
    content_text: gen.content_text,
    status,
    source: "ai",
    version: 1,
    created_by: ctx.user_id || null
  });

  const v = await repo.insertValidation(orgId, asset.id, validation);

  return { asset, validation: v, generation: { provider: gen.provider, model: gen.model } };
}

export async function validateOnly(orgId, body = {}) {
  const required = ["asset_type", "channel", "tone", "content_text"];
  for (const k of required) {
    if (!body?.[k]) throw badRequest(`${k} is required`);
  }

  const validation = validateAsset({
    channel: body.channel,
    tone: body.tone,
    content_text: body.content_text,
    rules: body.guardrails || {}
  });

  return { validation };
}

export async function listCampaignAssets(orgId, campaignId, q = {}) {
  return repo.listAssetsByCampaign(orgId, campaignId, q);
}

export async function approveAsset(orgId, assetId) {
  const a = await repo.getAsset(orgId, assetId);
  if (!a) throw notFound("Asset not found");
  return repo.updateStatus(orgId, assetId, "approved");
}

export async function rejectAsset(orgId, assetId) {
  const a = await repo.getAsset(orgId, assetId);
  if (!a) throw notFound("Asset not found");
  return repo.updateStatus(orgId, assetId, "rejected");
}

function badRequest(message) { const e = new Error(message); e.statusCode = 400; return e; }
function notFound(message) { const e = new Error(message); e.statusCode = 404; return e; }
