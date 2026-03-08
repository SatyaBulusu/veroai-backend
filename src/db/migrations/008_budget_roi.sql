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
