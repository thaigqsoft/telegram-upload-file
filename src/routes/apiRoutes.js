const express = require('express');
const multer = require('multer');
const UploadController = require('../controllers/uploadController');
const AuthController = require('../controllers/authController');

const router = express.Router();
const uploadController = new UploadController();
const authController = new AuthController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2000 * 1024 * 1024 // 2GB limit
  }
});

// Authentication routes
/**
 * POST /auth/send-code - Send Telegram verification code
 */
router.post('/auth/send-code', (req, res) => {
  authController.sendCode(req, res);
});

/**
 * POST /auth/confirm-code - Confirm Telegram verification code and save session
 */
router.post('/auth/confirm-code', (req, res) => {
  authController.confirmCode(req, res);
});

/**
 * POST /auth/session - Save STRING_SESSION
 * @param {string} string_session - The STRING_SESSION to save
 */
router.post('/auth/session', (req, res) => {
  authController.saveSession(req, res);
});

/**
 * GET /auth/session - Get the latest STRING_SESSION
 */
router.get('/auth/session', (req, res) => {
  authController.getSession(req, res);
});

/**
 * DELETE /auth/session - Clear all sessions
 */
router.delete('/auth/session', (req, res) => {
  authController.clearSessions(req, res);
});

/**
 * GET /auth/test - Test Telegram connection
 */
router.get('/auth/test', (req, res) => {
  authController.testConnection(req, res);
});

/**
 * POST /auth/logout - Logout and clear stored sessions
 */
router.post('/auth/logout', (req, res) => {
  authController.logout(req, res);
});

// Telegram initialization route
/**
 * POST /telegram/init - Initialize Telegram connection from environment variables
 */
router.post('/telegram/init', (req, res) => {
  uploadController.initTelegramFromEnv(req, res);
});

// File upload routes
/**
 * POST /upload - Upload a file to Telegram
 * @param {File} file - The file to upload
 * @param {string} chat_id - The chat ID to send the file to
 */
router.post('/upload', upload.single('file'), (req, res) => {
  uploadController.uploadFile(req, res);
});

/**
 * GET /files - Get all uploaded files
 */
router.get('/files', (req, res) => {
  uploadController.getFiles(req, res);
});

/**
 * GET /files/:id - Get a specific file by ID
 */
router.get('/files/:id', (req, res) => {
  uploadController.getFile(req, res);
});

/**
 * GET /files/:id/verify - Verify file integrity
 */
router.get('/files/:id/verify', (req, res) => {
  uploadController.verifyFile(req, res);
});

/**
 * DELETE /files/:id - Delete file
 */
router.delete('/files/:id', (req, res) => {
  uploadController.deleteFile(req, res);
});

// Chat mapping routes
/**
 * POST /chat-name - Set a name for a chat ID
 * @param {string} chat_id - The chat ID
 * @param {string} chat_name - The name to assign to the chat ID
 */
router.post('/chat-name', (req, res) => {
  uploadController.setChatName(req, res);
});

/**
 * GET /chat-name/:chatId - Get the name for a chat ID
 */
router.get('/chat-name/:chatId', (req, res) => {
  uploadController.getChatName(req, res);
});

/**
 * GET /chat-mappings - Get all chat mappings
 */
router.get('/chat-mappings', (req, res) => {
  uploadController.getChatMappings(req, res);
});

/**
 * DELETE /chat-mappings/:id - Delete chat mapping
 */
router.delete('/chat-mappings/:id', (req, res) => {
  uploadController.deleteChatMapping(req, res);
});

module.exports = router;
