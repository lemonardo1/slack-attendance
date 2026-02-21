-- Phase 1: safe cleanup for columns that are no longer used by application code.

ALTER TABLE attendance DROP COLUMN created_at;
ALTER TABLE work_logs DROP COLUMN created_at;
ALTER TABLE meeting_polls DROP COLUMN created_by;
ALTER TABLE meeting_availability DROP COLUMN created_at;
