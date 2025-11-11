// Test script for API routes
const express = require('express');
const apiRoutes = require('./src/routes/apiRoutes');

// Create a simple test server
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server for testing
const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// Export for testing
module.exports = { app, server };
