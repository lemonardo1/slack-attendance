-- Migration: Create users table
-- Description: Store user information for team member management

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE, -- Slack user ID
    user_name TEXT NOT NULL,
    display_name TEXT, -- 표시 이름 (optional)
    email TEXT,
    team_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- member, admin
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_slack_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
