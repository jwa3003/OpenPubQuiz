-- Migration: Add quiz_sessions_teams table
CREATE TABLE IF NOT EXISTS quiz_sessions_teams (
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT,
  PRIMARY KEY (session_id, team_id),
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(session_id) ON DELETE CASCADE
);
