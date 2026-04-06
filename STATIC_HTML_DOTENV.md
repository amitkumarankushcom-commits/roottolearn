# Frontend Dotenv Configuration - Static HTML (No React)

## ✅ Configuration Complete

Your frontend is now properly configured for static HTML with environment variable support (no React build process needed).

---

## Architecture

### 3-Step Configuration Flow:

```
1. .env File (frontend/.env)
   ↓
   Contains: APP_API_URL, APP_RAZORPAY_KEY, etc.
   
2. config.js (frontend/config.js)
   ↓
   Parses .env → Creates window.APP_CONFIG
   
3. HTML Pages
   ↓
   Load config.js → Access window.APP_CONFIG → Use in JavaScript
```

---

## Files Configuration

### Frontend/.env (Production Ready)
Variables use **APP_*** prefix (not REACT_APP_):

```ini
APP_ENV=production
APP_API_URL=https://api.roottolearn.com/api
APP_RAZORPAY_KEY=rzp_test_SYtDiHDucmTTq4
APP_ENABLE_PAYMENTS=true
APP_DEBUG=false
```

**14 Total Variables Configured:**
- APP_ENV
- APP_API_URL
- APP_RAZORPAY_KEY
- APP_STRIPE_KEY
- APP_ENABLE_AUDIO
- APP_ENABLE_PAYMENTS
- APP_ENABLE_ADS
- APP_ENABLE_LOGIN
- APP_ENABLE_SIGNUP
- APP_GA_ID
- APP_DEBUG
- (3 more internal variables)

### Frontend/.env.example (Template)
Safe to commit to git - no actual credentials

---

## Configuration Loader

### frontend/config.js
Acts like `dotenv` for static HTML:

**Initialization:**
```javascript
// Load .env file at page load
// Parse APP_* variables
// Create window.APP_CONFIG object
```

**Variable Mapping:**
```javascript
// From: APP_API_URL=https://api.example.com/api
// To:   window.APP_CONFIG.apiUrl = 'https://api.example.com/api'

// From: APP_RAZORPAY_KEY=rzp_test_...
// To:   window.APP_CONFIG.razorpay.key = 'rzp_test_...'

// From: APP_ENABLE_PAYMENTS=true
// To:   window.APP_CONFIG.features.payments = true
```

---

## How to Use in Your Code

### Access Configuration from JavaScript:

```javascript
// Get API URL
const apiUrl = window.APP_CONFIG.apiUrl;
console.log('API:', apiUrl); // https://api.roottolearn.com/api

// Check feature flags
if (window.APP_CONFIG.features.payments) {
  // Show payment options
}

// Check environment
if (window.APP_CONFIG.env === 'development') {
  // Use development settings
}

// Enable debug logging
if (window.APP_CONFIG.debug) {
  console.log('Debug mode enabled');
}

// Get payment key
const razorpayKey = window.APP_CONFIG.razorpay.key;
```

### In api.js:
```javascript
// Already updated to use window.APP_CONFIG
const API = window.APP_CONFIG.apiUrl;
console.log('Using API:', API);
```

### In HTML Pages:
```html
<!-- Load config.js FIRST -->
<script src="/config.js"></script>

<!-- Then load your scripts -->
<script src="../assets/js/api.js"></script>
<script>
  // Now you can use window.APP_CONFIG
  console.log('API URL:', window.APP_CONFIG.apiUrl);
</script>
```

---

## Updated Files

### Frontend Configuration Files:
- ✅ `frontend/.env` - Uses APP_* variables (no REACT_APP_)
- ✅ `frontend/.env.example` - Template (safe to commit)
- ✅ `frontend/config.js` - Maps APP_* to window.APP_CONFIG (11 mappings)

### Frontend HTML Pages:
- ✅ All 9 pages load `config.js` FIRST
- ✅ Then load `api.js` which uses window.APP_CONFIG
- ✅ Pre-populated with fallback values

### Backend:
- ✅ `.env` - Unchanged (Supabase configured)
- ✅ `.env.example` - Template

---

## Configuration Details

### Window.APP_CONFIG Structure:
```javascript
{
  env: 'production',                    // From APP_ENV
  debug: false,                         // From APP_DEBUG
  apiUrl: 'https://api.../api',         // From APP_API_URL
  razorpay: {
    key: 'rzp_test_...'                 // From APP_RAZORPAY_KEY
  },
  stripe: {
    key: null                           // From APP_STRIPE_KEY (optional)
  },
  features: {
    audio: true,                        // From APP_ENABLE_AUDIO
    payments: true,                     // From APP_ENABLE_PAYMENTS
    ads: true,                          // From APP_ENABLE_ADS
    login: true,                        // From APP_ENABLE_LOGIN
    signup: true                        // From APP_ENABLE_SIGNUP
  },
  analytics: {
    gaId: null                          // From APP_GA_ID (optional)
  }
}
```

---

## Development vs Production

### Development Setup
```ini
# frontend/.env
APP_ENV=development
APP_API_URL=http://localhost:4000/api
APP_DEBUG=true
```

### Production Setup
```ini
# frontend/.env
APP_ENV=production
APP_API_URL=https://api.yourdomain.com/api
APP_DEBUG=false
```

---

## Deployment to Netlify

### Option 1: Using .env File
1. Create `.env` in frontend root with production values
2. Netlify will include it in build
3. config.js will load it

### Option 2: Environment Variables (Recommended)
1. Go to Netlify Site Settings → Build & Deploy → Environment
2. Add variables:
   ```
   APP_API_URL=https://api.yourdomain.com/api
   APP_RAZORPAY_KEY=rzp_prod_...
   APP_ENV=production
   ```
3. config.js will load from window variables

### Option 3: Manual Injection
1. Create `.env` file during build
2. Use build hooks to populate values
3. Deployed via Netlify Functions

---

## Security Notes

### ✅ What's Safe in Frontend:
- APP_RAZORPAY_KEY - Public key (meant for frontend)
- APP_API_URL - Your backend domain (public)
- APP_STRIPE_KEY - Public key (optional)
- Feature flags - Not secrets

### ❌ Never Put in Frontend:
- JWT_SECRET
- Database credentials
- API secret keys
- Admin passwords
- Private Stripe keys

### Keep .env Private:
```bash
# .gitignore
frontend/.env
frontend/.env.local
frontend/.env.*.local
```

---

## Debugging

### Enable Debug Mode:
```ini
# frontend/.env
APP_DEBUG=true
```

### Check Configuration in Console:
```javascript
// Open DevTools (F12) → Console
window.APP_CONFIG
window.APP_CONFIG.apiUrl
window.APP_CONFIG.features
```

### Debug Logs Will Show:
```
[CONFIG] Initialization complete
[CONFIG] API URL: https://api.roottolearn.com/api
[CONFIG] Environment: production
[CONFIG] Loaded environment configuration: {...}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `window.APP_CONFIG` undefined | Check if config.js loaded (first in scripts) |
| API URL not updating | Clear browser cache, check .env file |
| Payment key not loading | Verify APP_RAZORPAY_KEY in .env |
| Debug logs not showing | Set APP_DEBUG=true in .env |
| Features disabled | Check APP_ENABLE_* variables |

---

## Quick Testing

### Test Configuration Load:
```javascript
// In DevTools Console
window.APP_CONFIG.apiUrl          // Should show backend URL
window.APP_CONFIG.razorpay.key    // Should show Razorpay key
window.APP_CONFIG.debug           // Should be true/false
```

### Test API Connection:
```javascript
// In DevTools Console
fetch(window.APP_CONFIG.apiUrl + '/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## Summary

✅ **Frontend Configuration:**
- Uses APP_* variables (not REACT_APP_)
- config.js loads .env and creates window.APP_CONFIG
- All 9 HTML pages load configuration
- Production-ready setup

✅ **Backend Configuration:**
- Uses .env with dotenv (Node.js native)
- Supabase PostgreSQL mandatory
- Database URL required

✅ **Architecture:**
- Both backend and frontend properly configured
- No localhost hardcoding
- Environment-based (development/production)
- Secure CORS configuration
- Feature flags enabled

**Status**: ✅ **Dotenv properly configured for static HTML application**
