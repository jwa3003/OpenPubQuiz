// backend/db/db.js
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./quiz.db', (err) => {
  if (err) console.error('❌ Failed to connect to database:', err.message);
  else console.log('✅ Connected to SQLite database.');
});

// Run schema setup
// ...existing code from db.js...

export default db;
