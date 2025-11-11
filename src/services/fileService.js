const FileModel = require('../models/fileModel');
const { calculateFileHash } = require('../utils/hashUtils');
const { normalizeFilename } = require('../utils/fileUtils');
const fs = require('fs');
const path = require('path');

/**
 * File service for handling file operations
 */
class FileService {
  /**
   * Process uploaded file and save to database
   * @param {Object} file - Multer file object
   * @param {string} chatId - Chat ID to send the file to
   * @param {string} chatName - Chat name (optional)
   * @returns {Promise<Object>} - Promise that resolves to the created file record
   */
  async processFile(file, chatId, chatName = null) {
    try {
      const normalizedName = normalizeFilename(file.originalname);
      const directory = path.dirname(file.path);
      const sanitizedPath = path.join(directory, `${Date.now()}-${normalizedName}`);

      let finalPath = file.path;

      try {
        fs.renameSync(file.path, sanitizedPath);
        if (fs.existsSync(sanitizedPath)) {
          finalPath = sanitizedPath;
        }
      } catch (error) {
        console.warn('Failed to rename file, using original path', error.message);
      }

      const hash = await calculateFileHash(finalPath);
      
      const fileRecord = await FileModel.create({
        filename: normalizedName,
        filepath: finalPath,
        chat_id: chatId,
        chat_name: chatName
      });
      
      fileRecord.hash = hash;
      
      return fileRecord;
    } catch (error) {
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }
  
  /**
   * Get all files
   * @returns {Promise<Array>} - Promise that resolves to an array of file records
   */
  async getAllFiles() {
    try {
      return await FileModel.getAll();
    } catch (error) {
      throw new Error(`Failed to get files: ${error.message}`);
    }
  }
  
  /**
   * Get file by ID
   * @param {number} id - File ID
   * @returns {Promise<Object>} - Promise that resolves to the file record
   */
  async getFileById(id) {
    try {
      return await FileModel.getById(id);
    } catch (error) {
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }
  
  /**
   * Update file status
   * @param {number} id - File ID
   * @param {string} status - New status
   * @param {string} hash - File hash (optional)
   * @returns {Promise<Object>} - Promise that resolves to the updated file record
   */
  async updateFileStatus(id, status, hash = null) {
    try {
      return await FileModel.updateStatus(id, status, hash);
    } catch (error) {
      throw new Error(`Failed to update file status: ${error.message}`);
    }
  }
  
  /**
   * Remove local copy of a file after successful upload
   * @param {number} id - File ID
   * @returns {Promise<void>}
   */
  async removeLocalFile(id) {
    try {
      const file = await FileModel.getById(id);
      if (!file) {
        throw new Error('File not found');
      }

      if (file.local_deleted) {
        return;
      }

      if (fs.existsSync(file.filepath)) {
        try {
          fs.unlinkSync(file.filepath);
        } catch (error) {
          throw new Error(`Failed to delete local file: ${error.message}`);
        }
      }

      await FileModel.markLocalDeleted(id);
    } catch (error) {
      throw new Error(`Failed to remove local file: ${error.message}`);
    }
  }

  /**
   * Delete file record and physical file
   * @param {number} id - File ID
   * @returns {Promise<void>}
   */
  async deleteFile(id) {
    try {
      // Get file record
      const file = await FileModel.getById(id);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Delete physical file if it exists
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }

      if (!file.local_deleted) {
        await FileModel.markLocalDeleted(id);
      }
      
      // Delete file record from database
      await FileModel.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  
  /**
   * Verify file integrity
   * @param {number} id - File ID
   * @returns {Promise<boolean>} - Promise that resolves to true if file is valid
   */
  async verifyFileIntegrity(id) {
    try {
      const file = await FileModel.getById(id);
      
      if (!file) {
        throw new Error('File not found');
      }

      if (file.local_deleted) {
        throw new Error('Local file has already been removed from the server.');
      }
      
      if (!file.hash) {
        throw new Error('File hash not available');
      }
      
      // Calculate current hash
      const currentHash = await calculateFileHash(file.filepath);
      
      // Compare with stored hash
      return currentHash === file.hash;
    } catch (error) {
      throw new Error(`Failed to verify file integrity: ${error.message}`);
    }
  }
}

module.exports = FileService;
