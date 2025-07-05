-- backend/setup.sql


DROP TABLE IF EXISTS teams_double_category;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS quiz_sessions;
DROP TABLE IF EXISTS quizzes;


-- Quizzes
CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories (per quiz)
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Questions
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id TEXT NOT NULL,
  text TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Answers
CREATE TABLE answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Quiz Sessions
CREATE TABLE quiz_sessions (
  session_id TEXT PRIMARY KEY,
  quiz_id TEXT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'waiting',
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Teams' double-points category selection
CREATE TABLE teams_double_category (
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (session_id, team_id),
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
