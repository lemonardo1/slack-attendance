-- Migration: Create work_tickets table
-- Description: Create table for managing work tickets/tasks

CREATE TABLE IF NOT EXISTS work_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    ticket_title TEXT NOT NULL,
    ticket_name TEXT NOT NULL, -- URL-safe name (e.g., "회원가입-API-개발")
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_work_tickets_user ON work_tickets(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_work_tickets_status ON work_tickets(status);
CREATE INDEX IF NOT EXISTS idx_work_tickets_name ON work_tickets(user_id, team_id, ticket_name);
