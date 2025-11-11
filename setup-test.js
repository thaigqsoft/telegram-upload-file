// Simple test to verify the setup
const fs = require('fs');
const path = require('path');

// Check if required directories exist
const requiredDirs = ['uploads', 'database', 'src/public/css', 'src/public/js'];

console.log('Checking project setup...\n');

let allGood = true;

// Check directories
requiredDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ Directory exists: ${dir}`);
  } else {
    console.log(`✗ Directory missing: ${dir}`);
    allGood = false;
  }
});

// Check if database file can be created
const dbPath = path.join(__dirname, 'database', 'app.db');
try {
  // Try to create database directory if it doesn't exist
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Try to write a test file to check permissions
  const testPath = path.join(dbDir, 'test.txt');
  fs.writeFileSync(testPath, 'test');
  fs.unlinkSync(testPath);
  
  console.log('✓ Database directory is writable');
} catch (error) {
  console.log('✗ Database directory is not writable:', error.message);
  allGood = false;
}

// Check if uploads directory is writable
const uploadsPath = path.join(__dirname, 'uploads');
try {
  const testPath = path.join(uploadsPath, 'test.txt');
  fs.writeFileSync(testPath, 'test');
  fs.unlinkSync(testPath);
  
  console.log('✓ Uploads directory is writable');
} catch (error) {
  console.log('✗ Uploads directory is not writable:', error.message);
  allGood = false;
}

// Check environment variables
console.log('\nChecking environment variables...');
if (process.env.TELEGRAM_API_ID) {
  console.log('✓ TELEGRAM_API_ID is set');
} else {
  console.log('⚠ TELEGRAM_API_ID is not set (required for Telegram connection)');
}

if (process.env.TELEGRAM_API_HASH) {
  console.log('✓ TELEGRAM_API_HASH is set');
} else {
  console.log('⚠ TELEGRAM_API_HASH is not set (required for Telegram connection)');
}

console.log('\nSetup check complete.');
if (allGood) {
  console.log('✓ All required components are in place!');
  console.log('\nTo start the server, run: npm start');
} else {
  console.log('✗ Some issues were detected. Please check the output above.');
}
