const SessionModel = require('../models/sessionModel');
const TelegramService = require('../services/telegramService');

/**
 * Authentication controller for handling Telegram session management
 */
class AuthController {
  /**
   * Send verification code to user's Telegram account
   */
  async sendCode(req, res) {
    try {
      const { api_id, api_hash, phone_number } = req.body;

      if (!api_id || !api_hash || !phone_number) {
        return res.status(400).json({ error: 'api_id, api_hash, and phone_number are required' });
      }

      const telegramService = new TelegramService();
      await telegramService.sendLoginCode(api_id, api_hash, phone_number);

      res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Confirm verification code and store STRING_SESSION
   */
  async confirmCode(req, res) {
    try {
      const { api_id, api_hash, phone_number, code } = req.body;

      if (!api_id || !api_hash || !phone_number || !code) {
        return res.status(400).json({ error: 'api_id, api_hash, phone_number, and code are required' });
      }

      const telegramService = new TelegramService();
      const stringSession = await telegramService.confirmLoginCode(api_id, api_hash, phone_number, code);

      await SessionModel.save(stringSession);
      process.env.TG_STRING_SESSION = stringSession;
      process.env.TELEGRAM_API_ID = String(api_id);
      process.env.TELEGRAM_API_HASH = api_hash;

      res.json({ message: 'Telegram authenticated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Internal helper to clear stored sessions and environment variables
   */
  async _performLogout() {
    await SessionModel.clear();
    delete process.env.TG_STRING_SESSION;
    delete process.env.TELEGRAM_API_ID;
    delete process.env.TELEGRAM_API_HASH;
  }

  /**
   * Save STRING_SESSION
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async saveSession(req, res) {
    try {
      const { string_session } = req.body;
      
      if (!string_session) {
        return res.status(400).json({ error: 'STRING_SESSION is required' });
      }
      
      const result = await SessionModel.save(string_session);
      
      res.json({
        message: 'Session saved successfully',
        session: result
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Get the latest STRING_SESSION
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSession(req, res) {
    try {
      // First check environment variables
      const envStringSession = process.env.TG_STRING_SESSION;
      if (envStringSession && envStringSession !== 'your_string_session_here') {
        return res.json({ string_session: envStringSession });
      }
      
      // Fall back to database
      const stringSession = await SessionModel.getLatest();
      
      if (!stringSession) {
        return res.status(404).json({ error: 'No session found' });
      }
      
      res.json({ string_session: stringSession });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Clear all sessions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async clearSessions(req, res) {
    try {
      await this._performLogout();
      res.json({ message: 'All sessions cleared successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * Logout via API (clear sessions and env)
   */
  async logout(req, res) {
    try {
      await this._performLogout();
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Test Telegram connection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async testConnection(req, res) {
    try {
      // First check environment variables
      const envStringSession = process.env.TG_STRING_SESSION;
      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;
      
      let stringSession;
      
      if (envStringSession && envStringSession !== 'your_string_session_here') {
        // Use environment variables
        if (!apiId || !apiHash) {
          return res.status(500).json({ 
            error: 'Telegram API credentials not configured in environment' 
          });
        }
        stringSession = envStringSession;
      } else {
        // Fall back to database
        stringSession = await SessionModel.getLatest();
        
        if (!stringSession) {
          return res.status(400).json({ error: 'No Telegram session found' });
        }
        
        if (!apiId || !apiHash) {
          return res.status(500).json({ 
            error: 'Telegram API credentials not configured' 
          });
        }
      }
      
      // Initialize Telegram service
      const telegramService = new TelegramService();
      await telegramService.initialize(stringSession, parseInt(apiId), apiHash);
      
      // Test connection by getting user info
      // Note: This is a simplified test, in a real implementation you would
      // get the actual user info
      
      res.json({ 
        message: 'Telegram connection successful',
        connected: telegramService.isConnected()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AuthController;
