-- Migration number: 0002 	 2025-10-07T00:00:00.000Z
-- Create attendance table for tracking check-ins and check-outs

CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    team_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_attendance_user_timestamp ON attendance(user_id, timestamp DESC);
CREATE INDEX idx_attendance_team_type ON attendance(team_id, type, timestamp DESC);

-- Drop old comments table if exists
DROP TABLE IF EXISTS comments;

