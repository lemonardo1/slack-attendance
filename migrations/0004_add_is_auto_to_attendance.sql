-- Migration number: 0004 	 2025-12-16T00:00:00.000Z
-- Add is_auto flag to attendance records (for auto /out detection)

ALTER TABLE attendance ADD COLUMN is_auto INTEGER NOT NULL DEFAULT 0;


