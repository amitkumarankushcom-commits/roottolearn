/**
 * ════════════════════════════════════════════════════════════════════
 *  Frontend Configuration Loader (config.js)
 *  For Static HTML Applications (No React/Build Tools)
 *  Loads .env file and exposes via window.APP_CONFIG
 * ════════════════════════════════════════════════════════════════════
 */

// Global configuration object - default values
window.APP_CONFIG = {
  // Environment
  env: 'production',
  debug: false,

  // API Configuration
  apiUrl: 'https://api.roottolearn.com/api',

  // Payment Configuration
  razorpay: {
    key: 'rzp_test_SYtDiHDucmTTq4',
  },
  stripe: {
    key: null,
  },

  // Feature flags
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

/**
 * Load environment variables from .env file
 * Maps APP_* variables to window.APP_CONFIG
 */
async function loadEnvConfig() {
  try {
    const response = await fetch('.env');
    
    if (!response.ok) {
      if (window.APP_CONFIG.debug) {
        console.warn('[CONFIG] .env file not found - using defaults');
      }
      return;
    }

    const envText = await response.text();
    const lines = envText.split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();

      if (!key || !value) continue;

      const cleanKey = key.trim();

      // Map .env variables to APP_CONFIG
      switch (cleanKey) {
        case 'APP_ENV':
          window.APP_CONFIG.env = value;
          break;

        case 'APP_DEBUG':
          window.APP_CONFIG.debug = value === 'true';
          break;

        case 'APP_API_URL':
          window.APP_CONFIG.apiUrl = value;
          break;

        case 'APP_RAZORPAY_KEY':
          window.APP_CONFIG.razorpay.key = value;
          break;

        case 'APP_STRIPE_KEY':
          if (value && value !== 'null' && value !== '') {
            window.APP_CONFIG.stripe.key = value;
          }
          break;

        case 'APP_GA_ID':
          if (value && value !== 'null' && value !== '') {
            window.APP_CONFIG.analytics.gaId = value;
          }
          break;

        case 'APP_ENABLE_AUDIO':
          window.APP_CONFIG.features.audio = value === 'true';
          break;

        case 'APP_ENABLE_PAYMENTS':
          window.APP_CONFIG.features.payments = value === 'true';
          break;

        case 'APP_ENABLE_ADS':
          window.APP_CONFIG.features.ads = value === 'true';
          break;

        case 'APP_ENABLE_LOGIN':
          window.APP_CONFIG.features.login = value === 'true';
          break;

        case 'APP_ENABLE_SIGNUP':
          window.APP_CONFIG.features.signup = value === 'true';
          break;
      }
    }

    if (window.APP_CONFIG.debug) {
      console.log('[CONFIG] Loaded environment configuration:', window.APP_CONFIG);
    }
  } catch (err) {
    if (window.APP_CONFIG.debug) {
      console.warn('[CONFIG] Error loading .env:', err.message);
    }
  }
}

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
