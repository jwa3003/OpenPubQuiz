const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = process.env.DB_PATH || './db.sqlite';

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
  } else {
    console.log(`📦 Connected to SQLite database at ${dbPath}`);
  }
});

// Create tables if not already created
const schemaPath = path.join(__dirname, 'models', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema, (err) => {
  if (err) {
    console.error('❌ Failed to apply schema:', err.message);
  } else {
    console.log('📐 Database schema applied');
  }
});

module.exports = db;
