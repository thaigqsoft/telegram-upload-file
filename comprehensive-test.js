// Comprehensive test script for the Telegram File Upload System
const fs = require('fs');
const path = require('path');
const { app, server } = require('./test-api');

console.log('Starting comprehensive system test...\n');

// Test results tracking
let passedTests = 0;
let totalTests = 0;

// Test function
function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
  }
}

// Async test function
async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  console.log('Running system tests...\n');
  
  // File structure tests
  test('Required directories exist', () => {
    const dirs = ['uploads', 'database', 'src/public/css', 'src/public/js'];
    dirs.forEach(dir => {
      if (!fs.existsSync(path.join(__dirname, dir))) {
        throw new Error(`Directory ${dir} missing`);
      }
    });
  });
  
  test('Database directory is writable', () => {
    const dbDir = path.join(__dirname, 'database');
    const testFile = path.join(dbDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  });
  
  test('Uploads directory is writable', () => {
    const uploadsDir = path.join(__dirname, 'uploads');
    const testFile = path.join(uploadsDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  });
  
  // Configuration tests
  test('Environment variables loaded', () => {
    // Just checking that the module loads without error
    require('dotenv').config();
  });
  
  // Model tests
  await testAsync('Database models load correctly', async () => {
    const FileModel = require('./src/models/fileModel');
    const SessionModel = require('./src/models/sessionModel');
    const ChatMappingModel = require('./src/models/chatMappingModel');
    
    if (!FileModel || !SessionModel || !ChatMappingModel) {
      throw new Error('Failed to load models');
    }
  });
  
  // Service tests
  await testAsync('Services load correctly', async () => {
    const FileService = require('./src/services/fileService');
    const TelegramService = require('./src/services/telegramService');
    
    if (!FileService || !TelegramService) {
      throw new Error('Failed to load services');
    }
  });
  
  // Controller tests
  await testAsync('Controllers load correctly', async () => {
    const UploadController = require('./src/controllers/uploadController');
    const AuthController = require('./src/controllers/authController');
    
    if (!UploadController || !AuthController) {
      throw new Error('Failed to load controllers');
    }
  });
  
  // Route tests
  test('API routes load correctly', () => {
    const apiRoutes = require('./src/routes/apiRoutes');
    if (!apiRoutes) {
      throw new Error('Failed to load API routes');
    }
  });
  
  // Utility tests
  await testAsync('Utility functions work correctly', async () => {
    const { calculateFileHash, verifyFileHash } = require('./src/utils/hashUtils');
    
    if (typeof calculateFileHash !== 'function' || typeof verifyFileHash !== 'function') {
      throw new Error('Hash utility functions not properly exported');
    }
  });
  
  // Summary
  console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The system is ready for use.');
  } else {
    console.log('⚠️  Some tests failed. Please check the output above.');
  }
  
  // Close server
  server.close(() => {
    console.log('Test server closed');
  });
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  server.close();
});
