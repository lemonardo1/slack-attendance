-- Migration: Add assignee fields to work_tickets
-- Description: Allow tickets to be assigned to team members

ALTER TABLE work_tickets ADD COLUMN assignee_id TEXT;
ALTER TABLE work_tickets ADD COLUMN assignee_name TEXT;

-- Create index for assignee lookups
CREATE INDEX IF NOT EXISTS idx_work_tickets_assignee ON work_tickets(assignee_id);
