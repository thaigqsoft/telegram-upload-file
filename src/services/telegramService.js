const { MTProto } = require('@mtproto/core');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const fs = require('fs');
const path = require('path');

/**
 * Telegram service for file uploads using MTProto
 */
class TelegramService {
  constructor() {
    this.client = null;

    if (!TelegramService.pendingLogins) {
      TelegramService.pendingLogins = new Map();
    }
    this.pendingLogins = TelegramService.pendingLogins;
  }
  
  /**
   * Send a verification code to the user's Telegram account
   * @param {number|string} apiId - Telegram API ID
   * @param {string} apiHash - Telegram API Hash
   * @param {string} phoneNumber - Telegram phone number
   * @returns {Promise<void>}
   */
  async sendLoginCode(apiId, apiHash, phoneNumber) {
    try {
      const normalizedPhone = phoneNumber.trim();
      const numericApiId = parseInt(apiId, 10);

      if (!normalizedPhone) {
        throw new Error('Phone number is required');
      }

      const session = new StringSession('');
      const client = new TelegramClient(session, numericApiId, apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      const result = await client.invoke(new Api.auth.SendCode({
        phoneNumber: normalizedPhone,
        apiId: numericApiId,
        apiHash,
        settings: new Api.CodeSettings({})
      }));

      this.pendingLogins.set(normalizedPhone, {
        client,
        apiId: numericApiId,
        apiHash,
        phoneCodeHash: result.phoneCodeHash,
      });
    } catch (error) {
      throw new Error(error.message || 'Failed to send login code');
    }
  }

  /**
   * Confirm the verification code and retrieve STRING_SESSION
   * @param {number|string} apiId
   * @param {string} apiHash
   * @param {string} phoneNumber
   * @param {string} code
   * @returns {Promise<string>} - STRING_SESSION
   */
  async confirmLoginCode(apiId, apiHash, phoneNumber, code) {
    const normalizedPhone = phoneNumber.trim();
    const pending = this.pendingLogins.get(normalizedPhone);

    if (!pending) {
      throw new Error('No pending login request found for this phone number');
    }

    const { client, phoneCodeHash } = pending;

    try {
      await client.invoke(new Api.auth.SignIn({
        phoneNumber: normalizedPhone,
        phoneCodeHash,
        phoneCode: code.trim(),
      }));

      const stringSession = client.session.save();
      await client.disconnect();
      this.pendingLogins.delete(normalizedPhone);

      return stringSession;
    } catch (error) {
      await client.disconnect().catch(() => {});
      this.pendingLogins.delete(normalizedPhone);

      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        throw new Error('This account has two-factor authentication enabled. Please disable it or extend the flow to support passwords.');
      }

      throw new Error(error.errorMessage || error.message || 'Failed to verify code');
    }
  }
  
  /**
   * Initialize Telegram client with STRING_SESSION
   * @param {string} stringSession - The STRING_SESSION for authentication
   * @param {number} apiId - Telegram API ID
   * @param {string} apiHash - Telegram API Hash
   * @returns {Promise<void>}
   */
  async initialize(stringSession, apiId, apiHash) {
    try {
      const session = new StringSession(stringSession);
      
      this.client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
      });

      await this.client.connect();

      if (this.client._updates?.thread?.catch) {
        this.client._updates.thread.catch(err => {
          if (err?.errorMessage === 'TIMEOUT' || err?.message?.includes('TIMEOUT')) {
            console.warn('Telegram update loop timeout, continuing...');
            return;
          }
          console.error('Telegram update loop error', err);
        });
      }

      const isAuthorized = await this.client.isUserAuthorized();
      if (!isAuthorized) {
        throw new Error('Telegram client is not authorized. Please login again.');
      }

      await this.client.invoke(new Api.help.GetConfig());

      console.log('Telegram client initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Telegram client: ${error.message}`);
    }
  }
  
  /**
   * Initialize Telegram client with environment variables
   * @returns {Promise<void>}
   */
  async initializeFromEnv() {
    try {
      // Get credentials from environment variables
      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;
      const stringSession = process.env.TG_STRING_SESSION;
      
      // Validate required variables
      if (!apiId) {
        throw new Error('TELEGRAM_API_ID is not set in environment variables');
      }
      
      if (!apiHash) {
        throw new Error('TELEGRAM_API_HASH is not set in environment variables');
      }
      
      if (!stringSession) {
        throw new Error('TG_STRING_SESSION is not set in environment variables');
      }
      
      // Initialize the client
      await this.initialize(stringSession, parseInt(apiId), apiHash);
    } catch (error) {
      throw new Error(`Failed to initialize Telegram client from environment: ${error.message}`);
    }
  }
  
  /**
   * Save STRING_SESSION for future use
   * @returns {Promise<string>} - The current STRING_SESSION
   */
  async saveSession() {
    if (!this.client) {
      throw new Error('Telegram client not initialized');
    }
    
    const stringSession = this.client.session.save();
    return stringSession;
  }
  
  /**
   * Upload file to Telegram
   * @param {string} filepath - Path to the file to upload
   * @param {string} chatId - Chat ID to send the file to
   * @param {Object|Function} options - Options or progress callback
   * @returns {Promise<Object>} - Promise that resolves to the upload result
   */
  async uploadFile(filepath, chatId, options = {}) {
    if (!this.client) {
      throw new Error('Telegram client not initialized');
    }
 
    try {
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        throw new Error(`File not found: ${filepath}`);
      }
 
      // Get file size
      const stats = fs.statSync(filepath);
      const fileSize = stats.size;
       
      console.log(`Uploading file: ${path.basename(filepath)} (${fileSize} bytes)`);
 
      if (typeof options === 'function') {
        options = { progressCallback: options };
      }

      const {
        progressCallback = null,
        threadId = null,
        caption = null,
        parseMode = null
      } = options;

      // For large files, we need to upload as media
      const result = await this.client.sendFile(chatId, {
        file: filepath,
        topMsgId: threadId ? Number(threadId) : undefined,
        replyTo: threadId ? Number(threadId) : undefined,
        caption: caption || undefined,
        parseMode: parseMode || undefined,
        progressCallback: progressValue => {
          if (progressCallback) {
            const safeProgress = Math.max(0, Math.min(1, progressValue || 0));
            const progressPercent = Math.round(safeProgress * 100);
            const uploadedBytes = Math.round(safeProgress * fileSize);
            progressCallback(progressPercent, uploadedBytes, fileSize);
          }
        }
      });
       
      console.log('File uploaded successfully');
      return result;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
  
  /**
   * Get chat information
   * @param {string} chatId - Chat ID to get information for
   * @returns {Promise<Object>} - Promise that resolves to chat information
   */
  async getChatInfo(chatId) {
    if (!this.client) {
      throw new Error('Telegram client not initialized');
    }
    
    try {
      const entity = await this.client.getEntity(chatId);
      return {
        id: entity.id.toString(),
        title: entity.title || entity.firstName || entity.username || 'Unknown',
        username: entity.username,
        type: entity.className
      };
    } catch (error) {
      throw new Error(`Failed to get chat info: ${error.message}`);
    }
  }
  
  /**
   * Check if client is connected
   * @returns {boolean} - True if connected, false otherwise
   */
  isConnected() {
    return this.client ? this.client.connected : false;
  }
}

module.exports = TelegramService;
