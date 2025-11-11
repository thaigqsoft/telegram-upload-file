// Test script for TG_STRING_SESSION functionality
const dotenv = require('dotenv');
dotenv.config();

console.log('Testing TG_STRING_SESSION configuration...');

// Check if TG_STRING_SESSION is set
const tgStringSession = process.env.TG_STRING_SESSION;

if (tgStringSession) {
  console.log('✓ TG_STRING_SESSION is set in environment variables');
  if (tgStringSession === 'your_string_session_here') {
    console.log('⚠ Warning: TG_STRING_SESSION is still set to the default placeholder value');
    console.log('  Please update it with your actual Telegram STRING_SESSION');
  } else {
    console.log('✓ TG_STRING_SESSION has a custom value (appears to be properly configured)');
  }
} else {
  console.log('✗ TG_STRING_SESSION is not set in environment variables');
}

// Check other required variables
const telegramApiId = process.env.TELEGRAM_API_ID;
const telegramApiHash = process.env.TELEGRAM_API_HASH;

if (telegramApiId) {
  console.log('✓ TELEGRAM_API_ID is set');
} else {
  console.log('✗ TELEGRAM_API_ID is not set');
}

if (telegramApiHash) {
  console.log('✓ TELEGRAM_API_HASH is set');
} else {
  console.log('✗ TELEGRAM_API_HASH is not set');
}

console.log('\nConfiguration test completed.');
