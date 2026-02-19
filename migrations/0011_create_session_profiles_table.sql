-- Store lightweight profile info for authenticated sessions
CREATE TABLE IF NOT EXISTS session_profiles (
  token TEXT PRIMARY KEY,
  initials TEXT NOT NULL
);
