-- Create sessions table for persistent web login sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL, -- unix epoch seconds
  expires_at INTEGER NOT NULL  -- unix epoch seconds
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
