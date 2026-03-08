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
