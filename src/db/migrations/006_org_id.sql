-- Step 7 delta: Add org_id for multi-tenancy (minimal)
-- Apply AFTER Step 6 migration.

ALTER TABLE campaigns ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE campaign_channels ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE audience_definitions ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE campaign_tracking_defaults ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';

ALTER TABLE content_assets ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE content_asset_versions ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE approvals ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';

ALTER TABLE profiles ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE profile_identifiers ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE profile_attributes ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE events ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';

ALTER TABLE revenue_events ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE attribution_runs ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE attribution_results ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE attribution_contributions ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';

ALTER TABLE audit_logs ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE outbox_events ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';
ALTER TABLE idempotency_keys ADD COLUMN org_id VARCHAR(64) NOT NULL DEFAULT 'org_local';

CREATE INDEX idx_campaigns_org ON campaigns(org_id);
CREATE INDEX idx_events_org_campaign_time ON events(org_id, campaign_id, occurred_at);
CREATE INDEX idx_rev_org_profile_time ON revenue_events(org_id, profile_id, occurred_at);
