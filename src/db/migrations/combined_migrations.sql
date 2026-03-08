-- ============================================================================
-- Combined Migration File
-- This file combines all migration files in sequential order
-- Run this file to apply all migrations in the correct sequence
-- ============================================================================

-- ============================================================================
-- Migration 001: VeroAI Step 1 schema (Campaigns + Content + Approvals + Gating)
-- ============================================================================

-- VeroAI Step 1 schema (Campaigns + Content + Approvals + Gating)

CREATE TABLE IF NOT EXISTS campaigns (
  id CHAR(26) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  objective ENUM('pipeline','revenue','conversion') NOT NULL,
  target_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status ENUM('draft','in_review','approved','live','ended') NOT NULL DEFAULT 'draft',
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campaign_channels (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  campaign_id CHAR(26) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  UNIQUE KEY uq_campaign_channel (campaign_id, channel),
  KEY idx_campaign_channel_campaign (campaign_id),
  CONSTRAINT fk_cc_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audience_definitions (
  id CHAR(26) PRIMARY KEY,
  campaign_id CHAR(26) NOT NULL,
  definition_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_aud_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campaign_tracking_defaults (
  campaign_id CHAR(26) PRIMARY KEY,
  utm_source_default VARCHAR(64) NULL,
  utm_campaign VARCHAR(128) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ctd_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS content_assets (
  id CHAR(26) PRIMARY KEY,
  campaign_id CHAR(26) NOT NULL,
  type ENUM('email','ad','landing') NOT NULL,
  format VARCHAR(16) NOT NULL DEFAULT 'json',
  title VARCHAR(255) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_ca_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS content_asset_versions (
  id CHAR(26) PRIMARY KEY,
  content_asset_id CHAR(26) NOT NULL,
  version INT NOT NULL,
  content_json JSON NOT NULL,
  generated_by_type ENUM('ai','human') NOT NULL,
  generated_by_model VARCHAR(64) NULL,
  generated_by_run_id VARCHAR(64) NULL,
  compliance_score DECIMAL(5,2) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_asset_version (content_asset_id, version),
  KEY idx_cav_asset (content_asset_id),
  CONSTRAINT fk_cav_asset FOREIGN KEY (content_asset_id) REFERENCES content_assets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS approvals (
  id CHAR(26) PRIMARY KEY,
  content_asset_id CHAR(26) NOT NULL,
  content_version INT NOT NULL,
  role ENUM('legal','cmo') NOT NULL,
  decision ENUM('approved','rejected') NOT NULL,
  comments TEXT NULL,
  actor_type ENUM('human','ai') NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_appr_asset (content_asset_id, content_version),
  CONSTRAINT fk_appr_asset FOREIGN KEY (content_asset_id) REFERENCES content_assets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(26) PRIMARY KEY,
  actor_type ENUM('human','ai','system') NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id CHAR(26) NOT NULL,
  metadata_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_time (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS outbox_events (
  id CHAR(26) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id CHAR(26) NOT NULL,
  payload_json JSON NOT NULL,
  status ENUM('pending','published','failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_outbox_status_time (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  idempotency_key VARCHAR(128) NOT NULL,
  route VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response_code INT NOT NULL,
  response_body_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_idem (idempotency_key, route)
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 002: Step 2 delta: Profiles + Events
-- Apply AFTER 001_init.sql (Step 1)
-- ============================================================================

-- Step 2 delta: Profiles + Events
-- Apply AFTER 001_init.sql (Step 1)

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(26) PRIMARY KEY,
  type ENUM('person','account') NOT NULL,
  lifecycle_stage VARCHAR(64) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profile_identifiers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  profile_id CHAR(26) NOT NULL,
  id_type ENUM('email','user_id','crm_id','anonymous_id') NOT NULL,
  id_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_identifier (id_type, id_value),
  KEY idx_profile (profile_id),
  CONSTRAINT fk_pid_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profile_attributes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  profile_id CHAR(26) NOT NULL,
  attr_key VARCHAR(64) NOT NULL,
  attr_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_profile_attr (profile_id, attr_key),
  KEY idx_profile_attr_profile (profile_id),
  CONSTRAINT fk_pattr_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id CHAR(26) PRIMARY KEY,
  client_event_id VARCHAR(64) NULL,
  profile_id CHAR(26) NOT NULL,
  name VARCHAR(64) NOT NULL,
  occurred_at TIMESTAMP(3) NOT NULL,
  properties_json JSON NOT NULL,
  campaign_id CHAR(26) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_client_event (client_event_id),
  KEY idx_evt_profile_time (profile_id, occurred_at),
  KEY idx_evt_campaign_time (campaign_id, occurred_at),
  CONSTRAINT fk_evt_profile FOREIGN KEY (profile_id) REFERENCES profiles(id),
  CONSTRAINT fk_evt_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 003: Step 3 delta: Revenue + Attribution
-- Apply AFTER Step 2 migrations
-- ============================================================================

-- Step 3 delta: Revenue + Attribution
-- Apply AFTER Step 2 migrations

CREATE TABLE IF NOT EXISTS revenue_events (
  id CHAR(26) PRIMARY KEY,
  external_id VARCHAR(128) NULL,
  source ENUM('crm','billing','csv') NOT NULL,
  profile_id CHAR(26) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  occurred_at TIMESTAMP(3) NOT NULL,
  properties_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_rev_external (source, external_id),
  KEY idx_rev_profile_time (profile_id, occurred_at),
  CONSTRAINT fk_rev_profile FOREIGN KEY (profile_id) REFERENCES profiles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attribution_runs (
  id CHAR(26) PRIMARY KEY,
  status ENUM('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
  model ENUM('last_touch','linear') NOT NULL,
  window_days INT NOT NULL DEFAULT 90,
  revenue_event_id CHAR(26) NOT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_atrun_rev (revenue_event_id),
  CONSTRAINT fk_atrun_rev FOREIGN KEY (revenue_event_id) REFERENCES revenue_events(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attribution_results (
  id CHAR(26) PRIMARY KEY,
  attribution_run_id CHAR(26) NOT NULL,
  revenue_event_id CHAR(26) NOT NULL,
  model ENUM('last_touch','linear') NOT NULL,
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  signals_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_atr_rev (revenue_event_id),
  CONSTRAINT fk_atr_run FOREIGN KEY (attribution_run_id) REFERENCES attribution_runs(id) ON DELETE CASCADE,
  CONSTRAINT fk_atr_rev FOREIGN KEY (revenue_event_id) REFERENCES revenue_events(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attribution_contributions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  attribution_result_id CHAR(26) NOT NULL,
  campaign_id CHAR(26) NOT NULL,
  weight DECIMAL(6,5) NOT NULL,
  KEY idx_atc_result (attribution_result_id),
  CONSTRAINT fk_atc_result FOREIGN KEY (attribution_result_id) REFERENCES attribution_results(id) ON DELETE CASCADE,
  CONSTRAINT fk_atc_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 004: Step 6 delta: Auth + RBAC (API Keys, Orgs, Users, Roles)
-- Apply AFTER previous migrations
-- ============================================================================

-- Step 6 delta: Auth + RBAC (API Keys, Orgs, Users, Roles)
-- Apply AFTER previous migrations

CREATE TABLE IF NOT EXISTS orgs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_user_org_email (org_id, email),
  CONSTRAINT fk_user_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  org_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_user_role (org_id, user_id, role),
  KEY idx_roles_user (org_id, user_id),
  CONSTRAINT fk_role_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  api_key VARCHAR(128) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_api_key (api_key),
  KEY idx_api_org_user (org_id, user_id),
  CONSTRAINT fk_apikey_org FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  CONSTRAINT fk_apikey_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed local org + users + roles + api keys (idempotent)
INSERT IGNORE INTO orgs (id, name) VALUES ('org_local', 'VeroAI Local');

INSERT IGNORE INTO users (id, org_id, email, display_name) VALUES
  ('usr_mkt_mgr', 'org_local', 'mkt_mgr@local', 'Marketing Manager'),
  ('usr_mkt_ops', 'org_local', 'mkt_ops@local', 'Marketing Ops'),
  ('usr_legal',   'org_local', 'legal@local',   'Legal Reviewer'),
  ('usr_cmo',     'org_local', 'cmo@local',     'CMO'),
  ('usr_sales',   'org_local', 'sales@local',   'Sales Leader'),
  ('usr_admin',   'org_local', 'admin@local',   'Admin');

INSERT IGNORE INTO user_roles (org_id, user_id, role) VALUES
  ('org_local', 'usr_mkt_mgr', 'marketing_manager'),
  ('org_local', 'usr_mkt_ops', 'marketing_ops'),
  ('org_local', 'usr_legal',   'legal'),
  ('org_local', 'usr_cmo',     'cmo'),
  ('org_local', 'usr_sales',   'sales'),
  ('org_local', 'usr_admin',   'admin');

-- API Keys (use in Postman header: X-API-Key)
INSERT IGNORE INTO api_keys (id, org_id, user_id, name, api_key, is_active) VALUES
  ('key_mkt_mgr', 'org_local', 'usr_mkt_mgr', 'MktMgr Key', 'veroai_local_mkt_mgr_key', 1),
  ('key_mkt_ops', 'org_local', 'usr_mkt_ops', 'MktOps Key', 'veroai_local_mkt_ops_key', 1),
  ('key_legal',   'org_local', 'usr_legal',   'Legal Key',  'veroai_local_legal_key', 1),
  ('key_cmo',     'org_local', 'usr_cmo',     'CMO Key',    'veroai_local_cmo_key', 1),
  ('key_sales',   'org_local', 'usr_sales',   'Sales Key',  'veroai_local_sales_key', 1),
  ('key_admin',   'org_local', 'usr_admin',   'Admin Key',  'veroai_local_admin_key', 1);

-- ============================================================================
-- Migration 005: Step 7 delta: Add org_id for multi-tenancy (minimal)
-- Apply AFTER Step 6 migration.
-- ============================================================================

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

-- ============================================================================
-- Migration 006: Step 8: Complete org_id propagation + indexes
-- Apply AFTER 005_step7_org_id.sql
-- ============================================================================

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



-- ============================================================================
-- Migration 007: Step 9A: Experiments (schema + core APIs)
-- Multi-tenant: org_id on every table
-- Goal: enable A/B testing and learning loops tied to profiles + campaigns.
-- ============================================================================

-- Step 9A: Experiments (schema + core APIs)
-- Multi-tenant: org_id on every table
-- Goal: enable A/B testing and learning loops tied to profiles + campaigns.

CREATE TABLE IF NOT EXISTS experiments (
  id            VARCHAR(64)  PRIMARY KEY,
  org_id        VARCHAR(64)  NOT NULL,
  campaign_id   VARCHAR(64)  NULL,
  name          VARCHAR(255) NOT NULL,
  hypothesis    TEXT         NULL,
  status        ENUM('draft','running','paused','completed','archived') NOT NULL DEFAULT 'draft',
  primary_metric     VARCHAR(64) NULL,
  success_event_type VARCHAR(64) NULL,
  start_at      DATETIME     NULL,
  end_at        DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_experiments_org_status (org_id, status),
  INDEX idx_experiments_org_campaign (org_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS experiment_variants (
  id            VARCHAR(64)  PRIMARY KEY,
  org_id        VARCHAR(64)  NOT NULL,
  experiment_id VARCHAR(64)  NOT NULL,
  name          VARCHAR(255) NOT NULL,
  traffic_pct   INT          NOT NULL DEFAULT 50,
  payload_json  JSON         NULL,
  is_control    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_variants_org_exp (org_id, experiment_id),
  UNIQUE KEY uniq_variant_name (org_id, experiment_id, name)
);

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id            VARCHAR(64)  PRIMARY KEY,
  org_id        VARCHAR(64)  NOT NULL,
  experiment_id VARCHAR(64)  NOT NULL,
  variant_id    VARCHAR(64)  NOT NULL,
  profile_id    VARCHAR(64)  NOT NULL,
  assigned_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assign_key    VARCHAR(128) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_assignment (org_id, experiment_id, profile_id),
  INDEX idx_assign_org_exp_var (org_id, experiment_id, variant_id),
  INDEX idx_assign_org_profile (org_id, profile_id, assigned_at)
);

-- ============================================================================
-- Migration 008: Step 10: Budgets, Spend (Campaign Costs), ROI views
-- Apply in MySQL (same DB as VeroAI). Run once.
-- ============================================================================

-- Step 10: Budgets, Spend (Campaign Costs), ROI views
-- Apply in MySQL (same DB as VeroAI). Run once.

CREATE TABLE IF NOT EXISTS budgets (
  id            CHAR(40) PRIMARY KEY,
  org_id        VARCHAR(64) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  total_amount  DECIMAL(18,6) NOT NULL DEFAULT 0,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_budgets_org_dates (org_id, start_date, end_date),
  INDEX idx_budgets_org_updated (org_id, updated_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_allocations (
  id               CHAR(40) PRIMARY KEY,
  org_id           VARCHAR(64) NOT NULL,
  budget_id        CHAR(40) NOT NULL,
  scope_type       VARCHAR(32) NOT NULL,
  scope_id         VARCHAR(128) NOT NULL,
  allocated_amount DECIMAL(18,6) NOT NULL DEFAULT 0,
  currency         CHAR(3) NOT NULL DEFAULT 'USD',
  notes            VARCHAR(255) NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_alloc_org_budget_scope (org_id, budget_id, scope_type, scope_id),
  INDEX idx_alloc_org_budget (org_id, budget_id),
  CONSTRAINT fk_alloc_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campaign_costs (
  id          CHAR(40) PRIMARY KEY,
  org_id      VARCHAR(64) NOT NULL,
  campaign_id CHAR(40) NULL,
  channel     VARCHAR(64) NOT NULL,
  cost_date   DATE NOT NULL,
  amount      DECIMAL(18,6) NOT NULL DEFAULT 0,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  metadata_json JSON NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_costs_org_date (org_id, cost_date),
  INDEX idx_costs_org_campaign_date (org_id, campaign_id, cost_date),
  INDEX idx_costs_org_channel_date (org_id, channel, cost_date)
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 009: Step 11: Executive Insights (facts + structured insights + narrative cache)
-- Run once in your MySQL DB.
-- ============================================================================

-- Step 11: Executive Insights (facts + structured insights + narrative cache)
-- Run once in your MySQL DB.

CREATE TABLE IF NOT EXISTS executive_insights (
  id            CHAR(40) PRIMARY KEY,
  org_id         VARCHAR(64) NOT NULL,
  window_days    INT NOT NULL,
  insight_type   VARCHAR(64) NOT NULL,
  severity       VARCHAR(16) NOT NULL,
  entity_type    VARCHAR(32) NOT NULL,
  entity_id      VARCHAR(128) NULL,
  title          VARCHAR(255) NOT NULL,
  facts_json     JSON NOT NULL,
  recommendation_json JSON NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exec_insights_org_window (org_id, window_days, created_at),
  INDEX idx_exec_insights_org_type (org_id, insight_type, created_at),
  INDEX idx_exec_insights_org_entity (org_id, entity_type, entity_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS executive_narratives (
  id            CHAR(40) PRIMARY KEY,
  org_id         VARCHAR(64) NOT NULL,
  window_days    INT NOT NULL,
  audience       VARCHAR(32) NOT NULL,
  narrative_md   TEXT NOT NULL,
  sources_json   JSON NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exec_narr_org_window (org_id, window_days, audience, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 010: Step 12: AI Asset Studio (assets + validations)
-- ============================================================================

-- Step 12: AI Asset Studio (assets + validations)
CREATE TABLE IF NOT EXISTS ai_assets (
  id           CHAR(40) PRIMARY KEY,
  org_id       VARCHAR(64) NOT NULL,
  campaign_id  CHAR(40) NOT NULL,
  asset_type   VARCHAR(64) NOT NULL,
  channel      VARCHAR(64) NOT NULL,
  tone         VARCHAR(64) NOT NULL,
  persona_json JSON NULL,
  inputs_json  JSON NULL,
  content_text TEXT NOT NULL,
  status       VARCHAR(32) NOT NULL DEFAULT 'draft',
  source       VARCHAR(16) NOT NULL DEFAULT 'ai',
  version      INT NOT NULL DEFAULT 1,
  created_by   VARCHAR(128) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ai_assets_org_campaign (org_id, campaign_id, created_at),
  INDEX idx_ai_assets_org_type (org_id, asset_type, created_at),
  INDEX idx_ai_assets_org_status (org_id, status, updated_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_asset_validations (
  id            CHAR(40) PRIMARY KEY,
  org_id         VARCHAR(64) NOT NULL,
  asset_id       CHAR(40) NOT NULL,
  passed         TINYINT(1) NOT NULL DEFAULT 0,
  risk_level     VARCHAR(16) NOT NULL DEFAULT 'low',
  reasons_json   JSON NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_valid_org_asset (org_id, asset_id, created_at),
  CONSTRAINT fk_ai_valid_asset FOREIGN KEY (asset_id) REFERENCES ai_assets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 011: Step 12B: Link assets to experiment variants (many-to-many)
-- ============================================================================

-- Step 12B: Link assets to experiment variants (many-to-many)
CREATE TABLE IF NOT EXISTS experiment_asset_variants (
  id            CHAR(40) PRIMARY KEY,
  org_id         VARCHAR(64) NOT NULL,
  experiment_id  CHAR(40) NOT NULL,
  variant_id     CHAR(40) NOT NULL,
  asset_id       CHAR(40) NOT NULL,
  slot           VARCHAR(64) NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_exp_variant_slot (org_id, experiment_id, variant_id, slot),
  INDEX idx_exp_assets_org_exp (org_id, experiment_id, created_at),
  INDEX idx_exp_assets_org_asset (org_id, asset_id, created_at),
  CONSTRAINT fk_eav_asset FOREIGN KEY (asset_id) REFERENCES ai_assets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 012: Step 13: Agent Actions (propose -> approve -> execute)
-- ============================================================================

-- Step 13: Agent Actions (propose -> approve -> execute)
CREATE TABLE IF NOT EXISTS agent_actions (
  id            CHAR(40) PRIMARY KEY,
  org_id         VARCHAR(64) NOT NULL,
  action_type    VARCHAR(64) NOT NULL,
  entity_type    VARCHAR(64) NOT NULL,
  entity_id      CHAR(40) NULL,
  status         VARCHAR(32) NOT NULL DEFAULT 'proposed',
  risk_level     VARCHAR(16) NOT NULL DEFAULT 'low',
  requires_roles JSON NULL,
  proposal_json  JSON NOT NULL,
  result_json    JSON NULL,
  created_by     VARCHAR(32) NOT NULL DEFAULT 'ai',
  created_by_id  VARCHAR(128) NULL,
  approved_by_id VARCHAR(128) NULL,
  approved_at    TIMESTAMP NULL,
  executed_at    TIMESTAMP NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_actions_org_status (org_id, status, updated_at),
  INDEX idx_actions_org_type (org_id, action_type, created_at),
  INDEX idx_actions_org_entity (org_id, entity_type, entity_id, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- Migration 012_patch: Patch campaign_costs table
-- ============================================================================

ALTER TABLE campaign_costs
  ADD COLUMN occurred_at DATETIME NULL,
  ADD INDEX idx_campaign_costs_org_campaign_time (org_id, campaign_id, occurred_at);

-- backfill existing rows
UPDATE campaign_costs
SET occurred_at = COALESCE(occurred_at, created_at)
WHERE occurred_at IS NULL;

-- ============================================================================
-- Migration 013: Step 13: Increase entity_id column width to accommodate longer IDs (e.g., AI asset IDs up to 40 chars)
-- Run once in your MySQL DB.
-- ============================================================================

-- Step 13: Increase entity_id column width to accommodate longer IDs (e.g., AI asset IDs up to 40 chars)
-- Run once in your MySQL DB.

-- Increase entity_id in audit_logs from CHAR(26) to VARCHAR(64)
ALTER TABLE audit_logs MODIFY COLUMN entity_id VARCHAR(64) NOT NULL;

-- Increase entity_id in outbox_events from CHAR(26) to VARCHAR(64)
ALTER TABLE outbox_events MODIFY COLUMN entity_id VARCHAR(64) NOT NULL;


SET SQL_SAFE_UPDATES = 1;