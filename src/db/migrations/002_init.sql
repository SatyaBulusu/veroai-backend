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
