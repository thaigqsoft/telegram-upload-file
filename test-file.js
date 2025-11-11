// Test script for File service
const FileService = require('./src/services/fileService');
const FileModel = require('./src/models/fileModel');

async function testFileService() {
  console.log('Testing File service...');
  
  try {
    const fileService = new FileService();
    console.log('✓ FileService class instantiated successfully');
    
    // Test getting all files (should be empty initially)
    const files = await fileService.getAllFiles();
    console.log(`✓ Retrieved files list (count: ${files.length})`);
    
    console.log('✓ File service test completed successfully');
  } catch (error) {
    console.error('✗ File service test failed:', error.message);
  }
}

testFileService();
