const db = require('../config/database');

/**
 * Session model for STRING_SESSION storage
 */
class SessionModel {
  /**
   * Save STRING_SESSION to database
   * @param {string} stringSession - The STRING_SESSION to save
   * @returns {Promise<Object>} - Promise that resolves to the created session record
   */
  static save(stringSession) {
    return new Promise((resolve, reject) => {
      // First, clear any existing sessions
      db.run(`DELETE FROM sessions`, [], (err) => {
        if (err) {
          reject(err);
        } else {
          // Insert the new session
          const stmt = db.prepare(`INSERT INTO sessions (string_session) VALUES (?)`);
          
          stmt.run([stringSession], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({ id: this.lastID, string_session: stringSession });
            }
          });
          
          stmt.finalize();
        }
      });
    });
  }
  
  /**
   * Get the latest STRING_SESSION from database
   * @returns {Promise<string|null>} - Promise that resolves to the STRING_SESSION or null
   */
  static getLatest() {
    return new Promise((resolve, reject) => {
      db.get(`SELECT string_session FROM sessions ORDER BY created_at DESC LIMIT 1`, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.string_session : null);
        }
      });
    });
  }
  
  /**
   * Clear all sessions from database
   * @returns {Promise<void>}
   */
  static clear() {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM sessions`, [], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = SessionModel;
