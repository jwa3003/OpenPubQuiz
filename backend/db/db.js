// backend/db/db.js
const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('./quiz.db', (err) => {
  if (err) console.error('❌ Failed to connect to database:', err.message);
  else console.log('✅ Connected to SQLite database.');
});


// Run schema setup
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id TEXT NOT NULL,
      text TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_correct BOOLEAN DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      session_id TEXT PRIMARY KEY,
      quiz_id TEXT NULL,
      current_question_index INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'waiting',
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_sessions_teams (
      session_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      team_name TEXT,
      PRIMARY KEY (session_id, team_id),
      FOREIGN KEY (session_id) REFERENCES quiz_sessions(session_id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS teams_double_category (
      session_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (session_id, team_id),
      FOREIGN KEY (session_id) REFERENCES quiz_sessions(session_id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);
});

module.exports = db;
