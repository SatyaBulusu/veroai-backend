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
