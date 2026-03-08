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
