/**
 * ════════════════════════════════════════════════════════════════════
 *  Frontend Configuration (config.js)
 *  Static HTML App - No .env loading
 *  Updated: 2026-04-12
 * ════════════════════════════════════════════════════════════════════
 */

// ================= ENVIRONMENT DETECTION =================
const IS_LOCAL = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';
const IS_DEV = window.location.hostname === 'dev.roottolearn.com';
const IS_PROD = window.location.hostname === 'roottolearn.com' ||
                window.location.hostname === 'www.roottolearn.com';

// ================= GLOBAL CONFIG =================
window.APP_CONFIG = {
  // Environment
  env: IS_PROD ? 'production' : IS_DEV ? 'development' : 'local',
  debug: IS_LOCAL || IS_DEV,

  // API Base URL - Auto detect
  apiUrl: (() => {
    if (IS_LOCAL) return 'http://localhost:4000/api';
    if (IS_DEV) return 'https://dev-api.roottolearn.com/api';
    return 'https://roottolearn-backend.onrender.com/api';
  })(),

  // Payment Configuration
  razorpay: {
    key: IS_PROD ? 'rzp_live_YOUR_KEY_HERE' : 'rzp_test_SYtDiHDucmTTq4',
    paymentLink: 'https://razorpay.me/@amitkumarankush',
  },

  stripe: {
    key: null,
  },

  // Feature Flags
  features: {
    audio: true,
    payments: true,
    ads: true,
    login: true,
    signup: true,
    otp: true,
  },

  // Analytics
  analytics: {
    gaId: IS_PROD ? 'G-YOUR_GA_ID' : null,
  },

  // Timeouts
  timeouts: {
    apiCall: 30000,  // 30 seconds
    otp: 300000,     // 5 minutes
  },

  // Retry Configuration
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
  }
};

// // ================= DEBUG LOG =================
// console.log("✅ Config Loaded:", window.APP_CONFIG);

// ================= OPTIONAL DEBUG =================
if (window.APP_CONFIG.debug) {
  console.log('[CONFIG] Initialization complete');
  console.log('[CONFIG] API URL:', window.APP_CONFIG.apiUrl);
  console.log('[CONFIG] Environment:', window.APP_CONFIG.env);
}