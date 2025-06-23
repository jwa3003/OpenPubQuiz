// backend/db.js
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./quiz.db', (err) => {
  if (err) console.error('❌ Failed to connect to DB:', err.message);
  else console.log('✅ Connected to SQLite DB.');
});

export default db;
