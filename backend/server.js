// ============================================================
//  backend/server.js — RootToLearn Express API Entry Point
// ============================================================
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Trust proxy (nginx / load balancer)
app.set('trust proxy', 1);

// ── Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS Configuration
const allowedOrigins = [
  'https://roottolearn999.netlify.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

// Also add from env if provided
if (process.env.CORS_ORIGINS) {
  const envOrigins = process.env.CORS_ORIGINS.split(',').map(s => s.trim());
  allowedOrigins.push(...envOrigins);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('CORS Not Allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// ── Preflight requests
app.options('*', cors(corsOptions));


// ── Body parsers & compression (BEFORE routes)
app.use(compression());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' }
}));

// ── Routes (with multer handling multipart in specific endpoints)
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/coupons',   require('./routes/coupons'));

// ── TEST ENDPOINT (dev only) — Get last OTP for testing
if (process.env.NODE_ENV !== 'production') {
  const db = require('./config/db');
  app.get('/api/test/last-otp/:email/:purpose', async (req, res) => {
    try {
      const { email, purpose } = req.params;
      // Get the plaintext OTP by checking which hash matches which was recently created
      // Actually, we can't get plaintext from hash. Instead, let's return the hash for verification testing
      const [rows] = await db.execute(
        `SELECT id, token, used FROM otp_tokens WHERE target=? AND purpose=? ORDER BY created_at DESC LIMIT 1`,
        [email, purpose]
      );
      if (!rows.length) return res.status(404).json({ error: 'No OTP found' });
      const row = rows[0];
      if (row.used) return res.status(400).json({ error: 'OTP already used' });
      res.json({ otp_hash: row.token, id: row.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ── Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Diagnostic endpoint (for troubleshooting)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    corsOrigins: allowedOrigins,
    requestOrigin: req.headers.origin,
  });
});

// ── 404
app.use((_, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Error handler
app.use((err, _, res, __) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error.' : err.message });
});

// ── Start server
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ RootToLearn API Server Started');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origins: ${allowedOrigins.join(', ')}`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`Ready to accept requests at http://localhost:${PORT}`);
});

// ── Error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error(`❌ Server error: ${err.message}`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
