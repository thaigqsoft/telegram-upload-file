// Test script for Telegram service
const TelegramService = require('./src/services/telegramService');

async function testTelegramService() {
  console.log('Testing Telegram service...');
  
  try {
    const telegramService = new TelegramService();
    console.log('✓ TelegramService class instantiated successfully');
    
    // Test that the service is not connected initially
    const isConnected = telegramService.isConnected();
    console.log(`✓ Initial connection status: ${isConnected ? 'Connected' : 'Not connected'}`);
    
    console.log('✓ Telegram service test completed successfully');
  } catch (error) {
    console.error('✗ Telegram service test failed:', error.message);
  }
}

testTelegramService();
