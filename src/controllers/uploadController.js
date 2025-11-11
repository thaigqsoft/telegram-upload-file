const FileService = require('../services/fileService');
const TelegramService = require('../services/telegramService');
const SessionModel = require('../models/sessionModel');
const ChatMappingModel = require('../models/chatMappingModel');
const { verifyFileHash } = require('../utils/hashUtils');

/**
 * Upload controller for handling file upload requests
 */
class UploadController {
  constructor() {
    this.fileService = new FileService();
    this.telegramService = new TelegramService();
  }
  
  /**
   * Handle file upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadFile(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const expectedToken = process.env.TOKEN_UPLOAD;
      if (!expectedToken) {
        return res.status(500).json({ error: 'Upload token is not configured on the server.' });
      }

      const providedToken = typeof req.body.token_upload === 'string'
        ? req.body.token_upload.trim()
        : typeof req.body.token === 'string'
          ? req.body.token.trim()
          : '';

      if (!providedToken || providedToken !== expectedToken) {
        return res.status(403).json({ error: 'Access denied: invalid upload token.' });
      }

      // Get chat ID from request
      const chatId = req.body.chat_id;
      if (!chatId) {
        return res.status(400).json({ error: 'Chat ID is required' });
      }

      const messageThreadIdRaw = req.body.message_thread_id || req.body.messageThreadId;
      const messageThreadId = messageThreadIdRaw ? Number(messageThreadIdRaw) : null;
      if (messageThreadIdRaw && Number.isNaN(messageThreadId)) {
        return res.status(400).json({ error: 'Invalid message_thread_id. Must be a number.' });
      }
      
      const captionRaw = typeof req.body.caption === 'string' ? req.body.caption : '';
      const caption = captionRaw.trim();
      if (caption && caption.length > 1024) {
        return res.status(400).json({ error: 'Caption is too long. Telegram allows up to 1024 characters.' });
      }

      // Process file and save to database
      const fileRecord = await this.fileService.processFile(req.file, chatId);
      
      // Get chat name if available
      const chatName = await ChatMappingModel.getChatName(chatId);
      
      // Update file record with chat name
      if (chatName) {
        await ChatMappingModel.setChatName(chatId, chatName);
        fileRecord.chat_name = chatName;
      }
      
      // Initialize Telegram service if not already done
      if (!this.telegramService.isConnected()) {
        // First try to get STRING_SESSION from environment
        const envStringSession = process.env.TG_STRING_SESSION;
        if (envStringSession && envStringSession !== 'your_string_session_here') {
          // Use environment variables
          const apiId = process.env.TELEGRAM_API_ID;
          const apiHash = process.env.TELEGRAM_API_HASH;
          
          if (!apiId || !apiHash) {
            return res.status(500).json({ 
              error: 'Telegram API credentials not configured in environment' 
            });
          }
          
          await this.telegramService.initialize(envStringSession, parseInt(apiId), apiHash);
        } else {
          // Fall back to database session
          const stringSession = await SessionModel.getLatest();
          if (stringSession) {
            // You'll need to set these environment variables
            const apiId = process.env.TELEGRAM_API_ID;
            const apiHash = process.env.TELEGRAM_API_HASH;
            
            if (!apiId || !apiHash) {
              return res.status(500).json({ 
                error: 'Telegram API credentials not configured' 
              });
            }
            
            await this.telegramService.initialize(stringSession, parseInt(apiId), apiHash);
          } else {
            return res.status(400).json({ 
              error: 'No Telegram session found. Please authenticate first or set TG_STRING_SESSION in environment.' 
            });
          }
        }
      }
      
      // Upload file to Telegram with progress tracking
      const result = await this.telegramService.uploadFile(fileRecord.filepath, chatId, {
        threadId: messageThreadId,
        caption: caption || undefined,
        progressCallback: (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      });
      
      // Update file status to uploaded
      await this.fileService.updateFileStatus(fileRecord.id, 'uploaded', fileRecord.hash);
      await this.fileService.removeLocalFile(fileRecord.id);
      const updatedRecord = await this.fileService.getFileById(fileRecord.id);
      
      res.json({
        message: 'File uploaded successfully',
        file: { ...updatedRecord, caption },
        telegram_result: result
      });
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update file status to failed
      if (req.file) {
        try {
          const files = await this.fileService.getAllFiles();
          const fileRecord = files.find(f => f.filepath === req.file.path);
          if (fileRecord) {
            await this.fileService.updateFileStatus(fileRecord.id, 'failed');
          }
        } catch (dbError) {
          console.error('Failed to update file status:', dbError);
        }
      }
      
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get all files
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFiles(req, res) {
    try {
      const files = await this.fileService.getAllFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get file by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFile(req, res) {
    try {
      const { id } = req.params;
      const file = await this.fileService.getFileById(id);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Delete file by ID
   */
  async deleteFile(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'File id is required' });
      }

      await this.fileService.deleteFile(Number(id));
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Set chat name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setChatName(req, res) {
    try {
      const { chat_id, chat_name } = req.body;
      
      if (!chat_id || !chat_name) {
        return res.status(400).json({ error: 'Chat ID and name are required' });
      }
      
      const result = await ChatMappingModel.setChatName(chat_id, chat_name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get chat name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChatName(req, res) {
    try {
      const { chatId } = req.params;
      
      if (!chatId) {
        return res.status(400).json({ error: 'Chat ID is required' });
      }
      
      const chatName = await ChatMappingModel.getChatName(chatId);
      res.json({ chat_id: chatId, chat_name: chatName });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get all chat mappings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChatMappings(req, res) {
    try {
      const mappings = await ChatMappingModel.getAll();
      res.json(mappings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Verify file integrity
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyFile(req, res) {
    try {
      const { id } = req.params;
      
      const file = await this.fileService.getFileById(id);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      if (file.local_deleted) {
        return res.json({
          file_id: id,
          valid: null,
          message: 'Local file already removed from server storage after upload.'
        });
      }

      const isValid = await this.fileService.verifyFileIntegrity(id);
      
      res.json({ 
        file_id: id, 
        valid: isValid,
        message: isValid ? 'File integrity verified' : 'File integrity check failed'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Initialize Telegram connection using environment variables
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async initTelegramFromEnv(req, res) {
    try {
      // Check if TG_STRING_SESSION is set in environment
      const stringSession = process.env.TG_STRING_SESSION;
      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;
      
      if (!stringSession || stringSession === 'your_string_session_here') {
        return res.status(400).json({ 
          error: 'TG_STRING_SESSION is not set in environment variables' 
        });
      }
      
      if (!apiId || !apiHash) {
        return res.status(400).json({ 
          error: 'Telegram API credentials not configured in environment' 
        });
      }
      
      // Initialize Telegram service
      await this.telegramService.initialize(stringSession, parseInt(apiId), apiHash);
      
      res.json({ 
        message: 'Telegram connection initialized successfully from environment variables',
        connected: this.telegramService.isConnected()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Delete chat mapping
   */
  async deleteChatMapping(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Mapping id is required' });
      }
      await ChatMappingModel.deleteById(Number(id));
      res.json({ message: 'Chat mapping deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = UploadController;
