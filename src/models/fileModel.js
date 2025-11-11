const db = require('../config/database');
const DUPLICATE_COLUMN_ERROR = 'duplicate column name';

let ensureLocalColumnsPromise = null;

const ensureLocalDeletionColumns = () => {
  if (ensureLocalColumnsPromise) {
    return ensureLocalColumnsPromise;
  }

  ensureLocalColumnsPromise = new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `ALTER TABLE files ADD COLUMN local_deleted INTEGER DEFAULT 0`,
        (err) => {
          if (err && !err.message.includes(DUPLICATE_COLUMN_ERROR)) {
            reject(err);
            return;
          }
          db.run(
            `ALTER TABLE files ADD COLUMN local_deleted_at DATETIME`,
            (innerErr) => {
              if (innerErr && !innerErr.message.includes(DUPLICATE_COLUMN_ERROR)) {
                reject(innerErr);
              } else {
                resolve();
              }
            }
          );
        }
      );
    });
  });

  return ensureLocalColumnsPromise;
};

/**
 * File model for database operations
 */
class FileModel {
  /**
   * Create a new file record
   * @param {Object} fileData - File data
   * @returns {Promise<Object>} - Promise that resolves to the created file record
   */
  static async create(fileData) {
    await ensureLocalDeletionColumns();
    return new Promise((resolve, reject) => {
      const { filename, filepath, chat_id, chat_name } = fileData;
      const stmt = db.prepare(`INSERT INTO files 
        (filename, filepath, chat_id, chat_name, status, local_deleted, local_deleted_at) 
        VALUES (?, ?, ?, ?, ?, 0, NULL)`);
      
      stmt.run([filename, filepath, chat_id, chat_name, 'pending'], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...fileData, status: 'pending' });
        }
      });
      
      stmt.finalize();
    });
  }
  
  /**
   * Get all files
   * @returns {Promise<Array>} - Promise that resolves to an array of file records
   */
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM files ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  /**
   * Get file by ID
   * @param {number} id - File ID
   * @returns {Promise<Object>} - Promise that resolves to the file record
   */
  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  /**
   * Update file status
   * @param {number} id - File ID
   * @param {string} status - New status
   * @param {string} hash - File hash (optional)
   * @returns {Promise<Object>} - Promise that resolves to the updated file record
   */
  static updateStatus(id, status, hash = null) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`UPDATE files 
        SET status = ?, hash = COALESCE(?, hash), updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`);
      
      stmt.run([status, hash, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, status, hash });
        }
      });
      
      stmt.finalize();
    });
  }
  
  /**
   * Delete file record
   * @param {number} id - File ID
   * @returns {Promise<void>}
   */
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM files WHERE id = ?`, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Mark a local file as deleted
   * @param {number} id
   * @returns {Promise<void>}
   */
  static markLocalDeleted(id) {
    return ensureLocalDeletionColumns().then(() => new Promise((resolve, reject) => {
      const stmt = db.prepare(`UPDATE files 
        SET local_deleted = 1,
            local_deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`);
      stmt.run([id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }));
  }
}

module.exports = FileModel;
