// Simple API route test
const apiRoutes = require('./src/routes/apiRoutes');
console.log('API routes loaded successfully');
console.log('Available routes:');
console.log('- POST /api/auth/session');
console.log('- GET /api/auth/session');
console.log('- DELETE /api/auth/session');
console.log('- GET /api/auth/test');
console.log('- POST /api/upload');
console.log('- GET /api/files');
console.log('- GET /api/files/:id');
console.log('- GET /api/files/:id/verify');
console.log('- POST /api/chat-name');
console.log('- GET /api/chat-name/:chatId');
console.log('- GET /api/chat-mappings');
