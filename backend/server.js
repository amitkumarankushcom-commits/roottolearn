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

// ================= CORS (ENHANCED) =================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'https://roottolearn.com',
  'https://www.roottolearn.com',
  'https://roottolearn-backend.onrender.com'
];

// 🔥 Enhanced CORS with better handling
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    } else {
      console.warn("⚠️  CORS blocked - Origin:", origin);
      return callback(new Error('CORS policy violation'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Explicit preflight handling (important!)
app.options('*', cors(corsOptions));

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

// ================= LOGGING MIDDLEWARE =================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '❌' : status >= 300 ? '⚠️' : '✅';
    console.log(`${color} [${req.method}] ${req.path} - ${status} (${duration}ms)`);
  });
  next();
});

// ================= HEALTH CHECK =================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// ================= ROUTES =================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/summaries', require('./routes/summaries'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/coupons', require('./routes/coupons'));

// ================= ROOT ENDPOINT =================
app.get('/', (req, res) => {
  res.json({
    name: 'RootToLearn API',
    version: '1.0.0',
    status: 'online',
    docs: '/api-docs'
  });
});

// ================= 404 ERROR HANDLER =================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error('[ERROR]', {
    message: err.message,
    status: statusCode,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(statusCode).json({
    error: isDevelopment ? err.message : 'An error occurred. Please try again later.',
    status: statusCode,
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
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