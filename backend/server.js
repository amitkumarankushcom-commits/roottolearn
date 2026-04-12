// ============================================================
//  backend/server.js - RootToLearn Express API Entry Point
// ============================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= TRUST PROXY =================
app.set('trust proxy', 1);

// ================= SECURITY =================
app.use(helmet({ contentSecurityPolicy: false }));

// ================= CORS (FINAL FIX) =================
const allowedOrigins = [
  'http://localhost:3000',
  'https://roottolearn.com'
];

// 🔥 IMPORTANT: this function handles all cases safely
app.use(cors({
  origin: function (origin, callback) {
    // Allow Postman / mobile apps / no-origin requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// Handle preflight (OPTIONS)
app.options('*', cors());

// ================= MIDDLEWARE =================
app.use(compression());

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ================= RATE LIMIT =================
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' }
}));

// ================= DEBUG (REMOVE LATER) =================
app.use((req, res, next) => {
  console.log("🌐 Incoming Origin:", req.headers.origin);
  next();
});

// ================= ROUTES =================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/coupons', require('./routes/coupons'));

// ================= 404 =================
app.use((_, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ================= ERROR HANDLER =================
app.use((err, _, res, __) => {
  console.error('[ERROR]', err.message);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Server error.'
      : err.message
  });
});

// ================= START SERVER =================
const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('✅ Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('═══════════════════════════════════════');
});

// ================= ERROR HANDLING =================
server.on('error', (err) => {
  console.error(`❌ Server error: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

module.exports = app;