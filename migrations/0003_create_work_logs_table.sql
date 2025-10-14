-- Migration number: 0003 	 2025-10-13T00:00:00.000Z
-- Create work_logs table for tracking daily work logs

CREATE TABLE IF NOT EXISTS work_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    log_content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_work_logs_user_timestamp ON work_logs(user_id, timestamp DESC);
CREATE INDEX idx_work_logs_team_timestamp ON work_logs(team_id, timestamp DESC);

