/**
 * ════════════════════════════════════════════════════════════════════
 *  Frontend Configuration Loader (config.js)
 *  For Static HTML Applications (No React/Build Tools)
 *  Loads .env file and exposes via window.APP_CONFIG
 * ════════════════════════════════════════════════════════════════════
 */

// Global configuration object - default values
window.APP_CONFIG = {
  env: 'production',
  debug: false,

  apiUrl: 'https://roottolearn-api.onrender.com/api',

  razorpay: {
    key: 'rzp_test_SYtDiHDucmTTq4',
  },

  stripe: {
    key: null,
  },

  features: {
    audio: true,
    payments: true,
    ads: true,
    login: true,
    signup: true,
  },

  analytics: {
    gaId: null,
  },
};

/**
 * Initialize configuration when page loads
 * Loads .env file and populates window.APP_CONFIG
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadEnvConfig();
  });
} else {
  loadEnvConfig();
}

// Log configuration on page load
if (window.APP_CONFIG.debug) {
  console.log('[CONFIG] Initialization complete');
  console.log('[CONFIG] API URL:', window.APP_CONFIG.apiUrl);
  console.log('[CONFIG] Environment:', window.APP_CONFIG.env);
}