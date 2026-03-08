import * as roiRepo from "./roi.repo.js";
import * as costRepo from "../costs/costs.repo.js";

export async function roiByCampaign(orgId, q = {}) {
  const window_days = Number(q.window_days || 30);
  const model = q.model || "last_touch";

  const [rev, spend] = await Promise.all([
    roiRepo.attributedRevenueByCampaign(orgId, { window_days, model }),
    costRepo.sumSpendByCampaign(orgId, { window_days })
  ]);

  const spendById = new Map(spend.map(s => [s.campaign_id, s.spend_sum]));
  const revById = new Map(rev.map(r => [r.campaign_id, r]));

  const ids = new Set([...spendById.keys(), ...revById.keys()]);

  const items = [...ids].map(campaign_id => {
    const s = Number(spendById.get(campaign_id) || 0);
    const r = revById.get(campaign_id);
    const revenue = Number(r?.attributed_revenue_sum || 0);

    const roi_multiple = s > 0 ? revenue / s : null;
    const net_roi = s > 0 ? (revenue - s) / s : null;

    return {
      campaign_id,
      spend_sum: s,
      attributed_revenue_sum: revenue,
      roi_multiple,
      net_roi,
      revenue_events: Number(r?.revenue_events || 0)
    };
  }).sort((a, b) => (b.roi_multiple ?? -1) - (a.roi_multiple ?? -1));

  return { window_days, model, items };
}

export async function roiByChannel(orgId, q = {}) {
  const window_days = Number(q.window_days || 30);
  const spend = await costRepo.sumSpendByChannel(orgId, { window_days });
  return { window_days, items: spend };
}
