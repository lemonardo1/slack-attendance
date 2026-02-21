-- Consolidated base schema (includes legacy 0012/0013 changes).
-- This migration is intentionally idempotent for existing environments.

DROP TABLE IF EXISTS comments;

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('in', 'out')),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_auto INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_timestamp
  ON attendance(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_team_type
  ON attendance(team_id, type, timestamp DESC);

CREATE TABLE IF NOT EXISTS work_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  log_content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_logs_user_timestamp
  ON work_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_work_logs_team_timestamp
  ON work_logs(team_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS work_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  ticket_description TEXT NOT NULL,
  ticket_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  assignee_id TEXT,
  assignee_name TEXT,
  parent_ticket_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_work_tickets_user
  ON work_tickets(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_work_tickets_status
  ON work_tickets(status);
CREATE INDEX IF NOT EXISTS idx_work_tickets_assignee
  ON work_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_work_tickets_parent_sort
  ON work_tickets(parent_ticket_id, sort_order);

UPDATE work_tickets
SET sort_order = id
WHERE sort_order = 0;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  team_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_slack_id
  ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_team
  ON users(team_id);

CREATE TABLE IF NOT EXISTS meeting_polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  windows_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  participant_name TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meeting_polls(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, participant_name, slot_key)
);

CREATE INDEX IF NOT EXISTS idx_meeting_availability_meeting_id
  ON meeting_availability(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_availability_meeting_participant
  ON meeting_availability(meeting_id, participant_name);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS session_profiles (
  token TEXT PRIMARY KEY,
  initials TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  provider TEXT,
  provider_user_id TEXT
);
