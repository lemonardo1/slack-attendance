-- Meeting planner tables (When2Meet style)

CREATE TABLE IF NOT EXISTS meeting_polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  windows_json TEXT NOT NULL,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  participant_name TEXT NOT NULL,
  slot_key TEXT NOT NULL, -- format: day-hour (e.g., 1-09)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meeting_polls(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, participant_name, slot_key)
);

CREATE INDEX IF NOT EXISTS idx_meeting_availability_meeting_id
  ON meeting_availability(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_availability_meeting_participant
  ON meeting_availability(meeting_id, participant_name);
