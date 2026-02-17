-- Migration: Add hierarchical structure to work_tickets
-- Description: Enable unlimited nested subtasks via parent reference

ALTER TABLE work_tickets ADD COLUMN parent_ticket_id INTEGER;
ALTER TABLE work_tickets ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Keep existing tasks in stable order.
UPDATE work_tickets
SET sort_order = id
WHERE sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_work_tickets_parent_sort
ON work_tickets(parent_ticket_id, sort_order);
