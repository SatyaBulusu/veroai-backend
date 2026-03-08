import { MockProvider } from "./providers/mock.provider.js";
import * as assetsRepo from "./ai_assets.repo.js";
import * as expRepo from "./experiment_assets.repo.js";
import { validateAsset } from "./guardrails.js";
import { db } from "../../db/mysql.js";

const provider = new MockProvider();

export async function generateVariantsAndLink(orgId, body = {}, ctx = {}) {
  const required = ["campaign_id", "experiment_id", "asset_type", "channel", "tone", "variants", "slot"];
  for (const k of required) {
    if (!body?.[k]) throw badRequest(`${k} is required`);
  }
  if (!Array.isArray(body.variants) || body.variants.length < 1) throw badRequest("variants must be a non-empty array");

  const [variantRows] = await db.query(
    `SELECT id, name, is_control
     FROM experiment_variants
     WHERE org_id = ? AND experiment_id = ?`,
    [orgId, body.experiment_id]
  );
  const byName = new Map(variantRows.map(v => [v.name, v]));
  const missing = body.variants.filter(n => !byName.has(n));
  if (missing.length) throw badRequest(`Unknown variant(s): ${missing.join(", ")}`);

  const persona = body.persona || null;
  const constraints = body.constraints || {};
  const inputs = body.inputs || {};
  const guardrails = body.guardrails || {};

  const created = [];

  for (const variantName of body.variants) {
    const gen = await provider.generate({
      asset_type: body.asset_type,
      channel: body.channel,
      tone: body.tone,
      persona,
      constraints,
      inputs: { ...inputs, variant: variantName }
    });

    const validation = validateAsset({
      channel: body.channel,
      tone: body.tone,
      content_text: gen.content_text,
      rules: guardrails
    });

    let status = body.status || "needs_approval";
    if (!validation.passed && validation.risk_level === "high") status = "rejected";

    const asset = await assetsRepo.insertAsset(orgId, {
      campaign_id: body.campaign_id,
      asset_type: body.asset_type,
      channel: body.channel,
      tone: body.tone,
      persona,
      inputs: { ...inputs, variant: variantName },
      content_text: gen.content_text,
      status,
      source: "ai",
      version: 1,
      created_by: ctx.user_id || null
    });

    await assetsRepo.insertValidation(orgId, asset.id, validation);

    const v = byName.get(variantName);
    const link = await expRepo.linkAssetToVariant(orgId, {
      experiment_id: body.experiment_id,
      variant_id: v.id,
      asset_id: asset.id,
      slot: body.slot
    });

    created.push({
      variant: { name: variantName, variant_id: v.id, is_control: !!v.is_control },
      asset,
      link,
      validation
    });
  }

  return {
    experiment_id: body.experiment_id,
    campaign_id: body.campaign_id,
    slot: body.slot,
    asset_type: body.asset_type,
    channel: body.channel,
    tone: body.tone,
    created_count: created.length,
    items: created
  };
}

export async function linkExistingAsset(orgId, body = {}) {
  const required = ["experiment_id", "variant_id", "asset_id", "slot"];
  for (const k of required) {
    if (!body?.[k]) throw badRequest(`${k} is required`);
  }
  const asset = await assetsRepo.getAsset(orgId, body.asset_id);
  if (!asset) throw notFound("Asset not found");
  return expRepo.linkAssetToVariant(orgId, body);
}

export async function listExperimentAssets(orgId, experimentId) {
  return expRepo.listExperimentAssets(orgId, experimentId);
}

function badRequest(message) { const e = new Error(message); e.statusCode = 400; return e; }
function notFound(message) { const e = new Error(message); e.statusCode = 404; return e; }
