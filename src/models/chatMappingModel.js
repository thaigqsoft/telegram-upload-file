const db = require('../config/database');

/**
 * Chat mapping model for storing chat ID to name mappings
 */
class ChatMappingModel {
  /**
   * Set chat name for a chat ID
   * @param {string} chatId - The chat ID
   * @param {string} chatName - The chat name
   * @returns {Promise<Object>} - Promise that resolves to the created/updated mapping
   */
  static setChatName(chatId, chatName) {
    return new Promise((resolve, reject) => {
      // Check if mapping already exists
      db.get(`SELECT id FROM chat_mappings WHERE chat_id = ?`, [chatId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            // Update existing mapping
            const stmt = db.prepare(`UPDATE chat_mappings 
              SET chat_name = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE chat_id = ?`);
            
            stmt.run([chatName, chatId], function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({ id: row.id, chat_id: chatId, chat_name: chatName });
              }
            });
            
            stmt.finalize();
          } else {
            // Insert new mapping
            const stmt = db.prepare(`INSERT INTO chat_mappings 
              (chat_id, chat_name) VALUES (?, ?)`);
            
            stmt.run([chatId, chatName], function(err) {
              if (err) {
                reject(err);
              } else {
                resolve({ id: this.lastID, chat_id: chatId, chat_name: chatName });
              }
            });
            
            stmt.finalize();
          }
        }
      });
    });
  }
  
  /**
   * Delete chat mapping by ID
   * @param {number} id - Mapping ID
   * @returns {Promise<void>}
   */
  static deleteById(id) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`DELETE FROM chat_mappings WHERE id = ?`);
      stmt.run([id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      stmt.finalize();
    });
  }
  
  /**
   * Get chat name by chat ID
   * @param {string} chatId - The chat ID
   * @returns {Promise<string|null>} - Promise that resolves to the chat name or null
   */
  static getChatName(chatId) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT chat_name FROM chat_mappings WHERE chat_id = ?`, [chatId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.chat_name : null);
        }
      });
    });
  }
  
  /**
   * Get all chat mappings
   * @returns {Promise<Array>} - Promise that resolves to an array of chat mappings
   */
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM chat_mappings ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = ChatMappingModel;
