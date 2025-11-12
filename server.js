const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const apiRoutes = require('./src/routes/apiRoutes');
const db = require('./src/config/database');
const SQLiteSessionStore = require('./src/session/sqliteSessionStore');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_me_in_env';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || (24 * 60 * 60 * 1000);

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.warn('Warning: ADMIN_USERNAME or ADMIN_PASSWORD is not configured. Dashboard login will be unavailable.');
}

if (SESSION_SECRET === 'change_me_in_env') {
  console.warn('Warning: SESSION_SECRET is using the default value. Please set a strong secret in the environment.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const sessionStore = new SQLiteSessionStore({
  db,
  ttl: SESSION_TTL_MS
});

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  return res.redirect('/login');
};

const ensureApiAuthenticated = (req, res, next) => {
  const isUploadEndpoint = req.path === '/upload' && req.method === 'POST';

  if (isUploadEndpoint) {
    return next();
  }

  if (req.session && req.session.isAuthenticated) {
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
};

// Login routes
app.get('/login', (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'src/public/login.html'));
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return res.status(500).send('Admin credentials not configured.');
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAuthenticated = true;
    req.session.username = username;
    req.session.loginAt = new Date().toISOString();
    req.session.ipAddress = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
    req.session.userAgent = req.get('user-agent') || '';
    return res.redirect('/');
  }

  return res.redirect('/login?error=1');
});

app.post('/auth/logout', ensureApiAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// Serve static files without auto index
app.use(express.static(path.join(__dirname, 'src/public'), { index: false }));

// API routes (protected)
app.use('/api', ensureApiAuthenticated, apiRoutes);

// Serve dashboard (protected)
app.get('/', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

app.get('/index.html', ensureAuthenticated, (req, res) => {
  res.redirect('/');
});

app.get('/docs.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/docs.html'));
});

app.get('/chat-mappings.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/chat-mappings.html'));
});

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

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Dashboard available at http://${HOST}:${PORT}`);
  
  // Log environment info
  console.log(`Telegram API ID: ${process.env.TELEGRAM_API_ID ? 'Configured' : 'Not configured'}`);
  console.log(`Telegram API Hash: ${process.env.TELEGRAM_API_HASH ? 'Configured' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  sessionStore.close();
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
