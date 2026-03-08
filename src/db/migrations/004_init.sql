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
