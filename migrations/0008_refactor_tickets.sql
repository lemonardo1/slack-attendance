-- Migration: Refactor work_tickets table
-- Description: Rename columns to align with new ticket title (ID) and description structure

-- 1. Rename existing columns to temporary names to avoid conflicts
ALTER TABLE work_tickets RENAME COLUMN ticket_title TO ticket_description;
ALTER TABLE work_tickets RENAME COLUMN ticket_name TO ticket_title; -- This will now hold the ID (e.g. FE-001)

-- 2. Add comment/note that ticket_title is now FE-001 format
-- (SQLite doesn't support column comments via SQL easily, just keeping this in migration script)
