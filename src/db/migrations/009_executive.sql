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
