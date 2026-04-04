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
const PORT = process.env.PORT || 4000;

// ── Trust proxy (nginx / load balancer)
app.set('trust proxy', 1);

// ── Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// ── CORS
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost').split(',').map(s=>s.trim());
app.use(cors({ origin: (o, cb) => (!o || origins.includes(o)) ? cb(null,true) : cb(new Error('CORS blocked')), credentials: true }));
// app.use(cors());

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

// ── 404
app.use((_, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Error handler
app.use((err, _, res, __) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error.' : err.message });
});

app.listen(PORT, () => {
  console.log(`[RootToLearn] API running → http://localhost:${PORT}`);
  console.log(`[RootToLearn] Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
