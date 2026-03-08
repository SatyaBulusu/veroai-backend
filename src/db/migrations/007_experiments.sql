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
