-- Extensions to the original schema.sql for Admin/Data Management features

-- Table to store history of file uploads
CREATE TABLE etl_upload_history (
    upload_id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_who_uploaded VARCHAR(100), -- Or a user ID if you have a users table
    status VARCHAR(50) NOT NULL, -- e.g., 'Success', 'Failed', 'Partial Success'
    records_processed INT,
    records_failed INT,
    upload_mode VARCHAR(20), -- e.g., 'Append', 'Replace'
    notes TEXT, -- Any messages or error summaries
    data_snapshot_reference VARCHAR(255) -- Optional: Reference to how to rollback (e.g., backup ID, version tag)
);

CREATE INDEX idx_etl_upload_history_timestamp ON etl_upload_history(upload_timestamp DESC);
CREATE INDEX idx_etl_upload_history_status ON etl_upload_history(status);

-- Table to store system logs (errors, warnings, info)
CREATE TABLE system_logs (
    log_id SERIAL PRIMARY KEY,
    log_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(20) NOT NULL, -- e.g., 'ERROR', 'WARNING', 'INFO'
    source VARCHAR(100), -- e.g., 'ETL', 'API', 'Dashboard'
    message TEXT NOT NULL,
    details JSONB -- For structured error details, stack traces, etc.
);

CREATE INDEX idx_system_logs_timestamp ON system_logs(log_timestamp DESC);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_source ON system_logs(source);

-- Note on Rollback:
-- True data rollback is complex. Strategies include:
-- 1. Logical Deletes + Versioning: Mark rows from a "bad" upload as inactive and have a way to reactivate rows from a "previous good" version.
--    This might involve adding `version_id` or `upload_id_fk` and an `is_active` flag to the `payroll` table.
-- 2. Full Backups: Restore the `payroll` table from a database backup taken before the upload. This is simpler but might have data loss if other valid changes occurred.
-- 3. Transactional ETL: If the ETL process for an upload runs in a single transaction, it can be rolled back entirely on failure.
--    For "undoing" a successful but incorrect upload, you'd need to identify and delete the specific records from that upload.
--    This implies `payroll` records should store `upload_id_fk` linking back to `etl_upload_history`.
--
-- For this conceptual design, we'll assume the `etl_upload_history` table stores information about uploads.
-- A `data_snapshot_reference` could point to a backup or a set of identifiers to manually/programmatically revert.
-- A more robust solution would involve adding an `upload_id` foreign key to the `payroll` table itself:
--
-- ALTER TABLE payroll ADD COLUMN upload_id_fk INT;
-- ALTER TABLE payroll ADD CONSTRAINT fk_payroll_upload
--    FOREIGN KEY (upload_id_fk) REFERENCES etl_upload_history(upload_id) ON DELETE SET NULL; -- Or RESTRICT
--
-- This `upload_id_fk` would allow for precise deletion of records from a specific upload if a "soft rollback" (delete) is desired.
-- The `data_snapshot_reference` in `etl_upload_history` could then be used for more comprehensive backup/restore strategies.
