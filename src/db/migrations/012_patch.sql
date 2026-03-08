ALTER TABLE campaign_costs
  ADD COLUMN occurred_at DATETIME NULL,
  ADD INDEX idx_campaign_costs_org_campaign_time (org_id, campaign_id, occurred_at);

-- backfill existing rows
UPDATE campaign_costs
SET occurred_at = COALESCE(occurred_at, created_at)
WHERE occurred_at IS NULL;
