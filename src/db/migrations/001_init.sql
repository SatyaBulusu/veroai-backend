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
