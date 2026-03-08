-- Step 8: Complete org_id propagation + indexes
-- Apply AFTER 005_step7_org_id.sql
SET SQL_SAFE_UPDATES = 0;
-- 1) Backfill child tables org_id from parents
UPDATE campaign_channels cc
JOIN campaigns c ON c.id = cc.campaign_id
SET cc.org_id = c.org_id
WHERE (cc.org_id IS NULL OR cc.org_id = '' OR cc.org_id = 'org_local') AND c.org_id IS NOT NULL;

UPDATE audience_definitions ad
JOIN campaigns c ON c.id = ad.campaign_id
SET ad.org_id = c.org_id
WHERE (ad.org_id IS NULL OR ad.org_id = '' OR ad.org_id = 'org_local') AND c.org_id IS NOT NULL;

UPDATE campaign_tracking_defaults ctd
JOIN campaigns c ON c.id = ctd.campaign_id
SET ctd.org_id = c.org_id
WHERE (ctd.org_id IS NULL OR ctd.org_id = '' OR ctd.org_id = 'org_local') AND c.org_id IS NOT NULL;

UPDATE content_assets ca
JOIN campaigns c ON c.id = ca.campaign_id
SET ca.org_id = c.org_id
WHERE (ca.org_id IS NULL OR ca.org_id = '' OR ca.org_id = 'org_local') AND c.org_id IS NOT NULL;

UPDATE content_asset_versions cav
JOIN content_assets ca ON ca.id = cav.content_asset_id
SET cav.org_id = ca.org_id
WHERE (cav.org_id IS NULL OR cav.org_id = '' OR cav.org_id = 'org_local') AND ca.org_id IS NOT NULL;

UPDATE approvals a
JOIN content_assets ca ON ca.id = a.content_asset_id
SET a.org_id = ca.org_id
WHERE (a.org_id IS NULL OR a.org_id = '' OR a.org_id = 'org_local') AND ca.org_id IS NOT NULL;

UPDATE profile_identifiers pi
JOIN profiles p ON p.id = pi.profile_id
SET pi.org_id = p.org_id
WHERE (pi.org_id IS NULL OR pi.org_id = '' OR pi.org_id = 'org_local') AND p.org_id IS NOT NULL;

UPDATE profile_attributes pa
JOIN profiles p ON p.id = pa.profile_id
SET pa.org_id = p.org_id
WHERE (pa.org_id IS NULL OR pa.org_id = '' OR pa.org_id = 'org_local') AND p.org_id IS NOT NULL;

UPDATE events e
LEFT JOIN profiles p ON p.id = e.profile_id
LEFT JOIN campaigns c ON c.id = e.campaign_id
SET e.org_id = COALESCE(p.org_id, c.org_id, e.org_id)
WHERE (e.org_id IS NULL OR e.org_id = '' OR e.org_id = 'org_local');

UPDATE revenue_events re
JOIN profiles p ON p.id = re.profile_id
SET re.org_id = p.org_id
WHERE (re.org_id IS NULL OR re.org_id = '' OR re.org_id = 'org_local') AND p.org_id IS NOT NULL;

UPDATE attribution_runs ar
JOIN revenue_events re ON re.id = ar.revenue_event_id
SET ar.org_id = re.org_id
WHERE (ar.org_id IS NULL OR ar.org_id = '' OR ar.org_id = 'org_local') AND re.org_id IS NOT NULL;

UPDATE attribution_results atr
JOIN revenue_events re ON re.id = atr.revenue_event_id
SET atr.org_id = re.org_id
WHERE (atr.org_id IS NULL OR atr.org_id = '' OR atr.org_id = 'org_local') AND re.org_id IS NOT NULL;

UPDATE attribution_contributions ac
JOIN attribution_results atr ON atr.id = ac.attribution_result_id
SET ac.org_id = atr.org_id
WHERE (ac.org_id IS NULL OR ac.org_id = '' OR ac.org_id = 'org_local') AND atr.org_id IS NOT NULL;

-- 2) Composite indexes (org-scoped)
CREATE INDEX idx_campaigns_org_updated ON campaigns(org_id, updated_at);
CREATE INDEX idx_campaign_channels_org_campaign ON campaign_channels(org_id, campaign_id);
CREATE INDEX idx_audience_defs_org_campaign_time ON audience_definitions(org_id, campaign_id, created_at);
CREATE INDEX idx_tracking_org_campaign ON campaign_tracking_defaults(org_id, campaign_id);

CREATE INDEX idx_content_assets_org_campaign ON content_assets(org_id, campaign_id, created_at);
CREATE INDEX idx_content_versions_org_asset_ver ON content_asset_versions(org_id, content_asset_id, version);
CREATE INDEX idx_approvals_org_asset_ver_role ON approvals(org_id, content_asset_id, content_version, role);

CREATE INDEX idx_profiles_org ON profiles(org_id);
CREATE INDEX idx_profile_ident_org_type_value ON profile_identifiers(org_id, id_type, id_value);
CREATE INDEX idx_profile_attr_org_profile_key ON profile_attributes(org_id, profile_id, attr_key);

-- Note: This index may already exist from 006_org_id.sql, so we create it conditionally
-- CREATE INDEX IF NOT EXISTS is not supported in MySQL, so we'll let the setup script handle duplicates
CREATE INDEX idx_events_org_campaign_time ON events(org_id, campaign_id, occurred_at);
CREATE INDEX idx_events_org_profile_time ON events(org_id, profile_id, occurred_at);

CREATE INDEX idx_rev_org_extid ON revenue_events(org_id, external_id);
CREATE INDEX idx_rev_org_profile_time ON revenue_events(org_id, profile_id, occurred_at);

CREATE INDEX idx_attr_runs_org_rev_time ON attribution_runs(org_id, revenue_event_id, created_at);
CREATE INDEX idx_attr_results_org_rev ON attribution_results(org_id, revenue_event_id);
CREATE INDEX idx_attr_contrib_org_result_campaign ON attribution_contributions(org_id, attribution_result_id, campaign_id);

-- Supporting tables (if present)
CREATE INDEX idx_idem_org_key ON idempotency_keys(org_id, idempotency_key);
CREATE INDEX idx_audit_org_time ON audit_logs(org_id, created_at);
CREATE INDEX idx_outbox_org_time ON outbox_events(org_id, created_at);

SET SQL_SAFE_UPDATES = 1;

