// ============================================================
//  backend/server.js - RootToLearn Express API Entry Point
// ============================================================

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const supabase    = require("./config/supabase");

// CREATE APP FIRST (very important - MUST be before app.use/app.set)
const app  = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (nginx / load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS Configuration - parse comma-separated origins into array
const corsOriginsList = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin);

app.use(cors({
  origin: corsOriginsList,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.options('*', cors({
  origin: corsOriginsList,
  credentials: true
}));

// ── Body parsers & compression
app.use(compression());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' }
}));

// ── Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/payments',  require('./routes/payments'));
app.use('/api/coupons',   require('./routes/coupons'));

// ── TEST ENDPOINT (dev only)
if (process.env.NODE_ENV !== 'production') {
  const db = require('./config/db');

  app.get('/api/test/last-otp/:email/:purpose', async (req, res) => {
    try {
      const { email, purpose } = req.params;

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
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// ── Diagnostic endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    corsOrigins: corsOriginsList.join(', '),
    requestOrigin: req.headers.origin,
  });
});

app.get("/api/test/db", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .limit(1);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 404 handler
app.use((_, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Error handler
app.use((err, _, res, __) => {
  console.error('[ERROR]', err.message);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Server error.'
      : err.message
  });
});

// ── Start server
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ RootToLearn API Server Started');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: PostgreSQL/Supabase`);
  console.log('═══════════════════════════════════════════════════');
});

// ── Server error handling
server.on('error', (err) => {
  console.error(`❌ Server error: ${err.message}`);
});

// ── Handle unhandled promises
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

module.exports = app;