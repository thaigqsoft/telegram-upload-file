const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../database/app.db'));

const ensureColumn = (table, column, definition) => {
  db.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) {
      console.error(`Failed to inspect table ${table}:`, err.message);
      return;
    }
    const hasColumn = Array.isArray(rows) && rows.some(row => row.name === column);
    if (!hasColumn) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, alterErr => {
        if (alterErr) {
          console.error(`Failed to add column ${column} to ${table}:`, alterErr.message);
        } else {
          console.log(`Added column ${column} to ${table}`);
        }
      });
    }
  });
};

// Initialize the database tables
db.serialize(() => {
  // Create files table
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    hash TEXT,
    chat_id TEXT NOT NULL,
    chat_name TEXT,
    local_deleted INTEGER DEFAULT 0,
    local_deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  ensureColumn('files', 'local_deleted', 'INTEGER DEFAULT 0');
  ensureColumn('files', 'local_deleted_at', 'DATETIME');
  
  // Create sessions table for STRING_SESSION storage
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    string_session TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Create chat mappings table
  db.run(`CREATE TABLE IF NOT EXISTS chat_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT UNIQUE NOT NULL,
    chat_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS auth_sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL,
    username TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_at DATETIME
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expire ON auth_sessions(expire)`);
});

module.exports = db;
