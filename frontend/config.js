/**
 * ════════════════════════════════════════════════════════════════════
 *  Frontend Configuration (config.js)
 *  Static HTML App - No .env loading
 * ════════════════════════════════════════════════════════════════════
 */

// ================= GLOBAL CONFIG =================
window.APP_CONFIG = {
  // Environment
  env: 'production',
  debug: false,

  // API Base URL
  apiUrl: 'https://roottolearn-api.onrender.com/api',

  // Payment Configuration
  razorpay: {
    key: 'rzp_test_SYtDiHDucmTTq4',
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
  },

  // Analytics
  analytics: {
    gaId: null,
  },
};

// ================= DEBUG LOG =================
console.log("✅ Config Loaded:", window.APP_CONFIG);

// ================= OPTIONAL DEBUG =================
if (window.APP_CONFIG.debug) {
  console.log('[CONFIG] Initialization complete');
  console.log('[CONFIG] API URL:', window.APP_CONFIG.apiUrl);
  console.log('[CONFIG] Environment:', window.APP_CONFIG.env);
}