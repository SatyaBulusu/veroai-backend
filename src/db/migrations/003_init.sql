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
