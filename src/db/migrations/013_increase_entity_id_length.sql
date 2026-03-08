-- Step 13: Increase entity_id column width to accommodate longer IDs (e.g., AI asset IDs up to 40 chars)
-- Run once in your MySQL DB.

-- Increase entity_id in audit_logs from CHAR(26) to VARCHAR(64)
ALTER TABLE audit_logs MODIFY COLUMN entity_id VARCHAR(64) NOT NULL;

-- Increase entity_id in outbox_events from CHAR(26) to VARCHAR(64)
ALTER TABLE outbox_events MODIFY COLUMN entity_id VARCHAR(64) NOT NULL;
