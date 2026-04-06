# Environment Configuration Setup ✅

## Overview
Your project now has proper environment variable management for both backend (Node.js) and frontend (Static HTML).

---

## Backend Configuration

### File: `backend/.env`
**Status**: ✅ Configured with Supabase  
**Type**: Node.js dotenv file  
**Security**: Private (never commit to git)

#### Key Variables:
```
NODE_ENV=production          # Set to 'development' for local testing
PORT=4000                    # API server port
DATABASE_URL=...             # Supabase PostgreSQL connection
SUPABASE_URL=...             # Supabase project URL
JWT_SECRET=...               # For JWT authentication
EMAIL_USER=...               # Gmail SMTP credentials
RAZORPAY_KEY_ID=...          # Payment gateway keys
```

#### How It Works:
1. Backend server loads `.env` automatically (via `dotenv.config()` in server.js)
2. All environment variables available as `process.env.VARIABLE_NAME`
3. Example in routes: `const apiKey = process.env.OPENAI_API_KEY`

#### Setup Instructions:
```bash
# Already configured - just verify variables are set correctly
cd backend
npm start
# Should print: ✓ Supabase (PostgreSQL) connected
```

---

## Frontend Configuration

### File: `frontend/.env`
**Status**: ✅ Created  
**Type**: Environment file for JavaScript  
**Security**: Private (never commit to git)

#### Key Variables:
```
REACT_APP_ENV=production         # development or production
REACT_APP_API_URL=...            # Backend API URL
REACT_APP_RAZORPAY_KEY=...       # Payment gateway key
REACT_APP_ENABLE_PAYMENTS=true   # Feature flags
```

### File: `frontend/config.js`
**Status**: ✅ Created (acts like dotenv for frontend)  
**Type**: JavaScript configuration loader  
**Features**: Loads .env file and exposes via `window.APP_CONFIG`

#### How It Works:
1. Every HTML page loads `config.js` BEFORE `api.js`
2. `config.js` reads `.env` file and populates `window.APP_CONFIG`
3. Frontend code accesses config via: `window.APP_CONFIG.apiUrl`

#### Example Usage:
```javascript
// In api.js (or any frontend script):
const API = window.APP_CONFIG.apiUrl;
console.log('Using API:', API);

// Check debug mode:
if (window.APP_CONFIG.debug) {
  console.log('Debug enabled');
}

// Access feature flags:
if (window.APP_CONFIG.features.payments) {
  // Show payment options
}
```

---

## HTML Files Updated ✅

All HTML files now load `config.js` before `api.js`:

| File | Status | Updated |
|------|--------|---------|
| index.html | ✓ | Added config.js |
| login.html | ✓ | Added config.js |
| signup.html | ✓ | Added config.js |
| forgot.html | ✓ | Added config.js |
| app.html | ✓ | Added config.js |
| profile.html | ✓ | Added config.js |
| pricing.html | ✓ | Added config.js |
| admin-login.html | ✓ | Added config.js |
| admin-dashboard.html | ✓ | Added config.js |

**Script Loading Order**:
```html
<script src="/config.js"></script>          <!-- Load first! -->
<script src="../assets/js/api.js"></script> <!-- Uses window.APP_CONFIG -->
```

---

## Configuration Files

### Backend Files

#### `.env` (Production Ready)
```ini
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...  # Supabase
SUPABASE_URL=https://...
JWT_SECRET=... (32+ chars)
EMAIL_USER=your-email@gmail.com
RAZORPAY_KEY_ID=rzp_...
```

#### `.env.example` (Template)
```ini
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
JWT_SECRET=your-32-char-random-secret-key-here
# ...
```

**Use `.env.example` as template when deploying**

---

### Frontend Files

#### `.env` (Production Ready)
```ini
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.roottolearn.com/api
REACT_APP_RAZORPAY_KEY=rzp_test_...
REACT_APP_ENABLE_PAYMENTS=true
```

#### `.env.example` (Template)
```ini
REACT_APP_ENV=development
REACT_APP_API_URL=https://api.example.com/api
REACT_APP_RAZORPAY_KEY=rzp_test_xxxxxxxxxxxxxxxx
```

#### `config.js` (Configuration Loader)
- Automatically loads `.env` at page load
- Exposes configuration via `window.APP_CONFIG`
- Required in all HTML files

---

## How to Update Configuration

### For Development
1. **Backend**: Edit `backend/.env`
   ```bash
   NODE_ENV=development
   PORT=4000
   REACT_APP_API_URL=http://localhost:4000/api
   ```

2. **Frontend**: Edit `frontend/.env`
   ```bash
   REACT_APP_ENV=development
   REACT_APP_API_URL=http://localhost:4000/api
   ```

### For Production (Netlify, Render, Railway, etc.)

#### Backend (Render/Railway)
1. Go to deployment dashboard
2. Add environment variables:
   - `DATABASE_URL` = Your Supabase connection string
   - `JWT_SECRET` = Strong random secret
   - `PORT` = 4000
   - All other variables from `.env.example`

#### Frontend (Netlify)
1. Site Settings → Build & Deploy → Environment
2. Add environment variables:
   - `REACT_APP_API_URL` = Your backend API URL
   - `REACT_APP_RAZORPAY_KEY` = Public key only
   - Other REACT_APP_* variables

---

## Security Best Practices

### ✅ DO:
- [x] Keep `.env` files PRIVATE (never commit)
- [x] Use strong, unique secrets (32+ chars)
- [x] Rotate secrets periodically
- [x] Use `.env.example` as template
- [x] Only store PUBLIC keys in frontend (Razorpay, Stripe public keys)
- [x] Store SECRET keys in backend only

### ❌ DON'T:
- [ ] Commit `.env` to git
- [ ] Hardcode secrets in code
- [ ] Share `.env` files
- [ ] Use weak secrets
- [ ] Put secret keys in frontend `.env`
- [ ] Use same secrets across environments

---

## Debugging

### Check Backend Configuration
```bash
cd backend
npm run test-db
# Should show: ✓ DB Connected: [...]
```

### Check Frontend Configuration
1. Open browser DevTools (F12)
2. In console, check:
   ```javascript
   window.APP_CONFIG
   // Should show all configuration
   ```

### Enable Debug Mode
```ini
# In frontend/.env
REACT_APP_DEBUG=true
```

Then check console for debug logs:
```
[CONFIG] Environment loaded: { ... }
[API] Using API URL: ...
```

---

## Deployment Checklist

- [ ] Backend `.env` updated with production values
- [ ] Frontend `.env` updated with production API URL
- [ ] All `.env` files are `.gitignore`'d
- [ ] `.env.example` files committed (no secrets)
- [ ] Database connection verified
- [ ] CORS origins updated (no `*` in production)
- [ ] JWT secrets strong (32+ chars)
- [ ] Email credentials working
- [ ] Payment keys valid
- [ ] Both servers tested

---

## File Structure

```
RootToLearn/
├── backend/
│   ├── .env                 ✅ Main configuration (production)
│   ├── .env.example         ✅ Template (safe to commit)
│   ├── server.js           ✅ Loads .env automatically
│   ├── config/
│   │   ├── db.js          ✅ Uses DATABASE_URL
│   │   └── supabase.js    ✅ Uses SUPABASE_* vars
│   └── routes/            ✅ Use process.env
├── frontend/
│   ├── .env               ✅ Configuration file (production)
│   ├── .env.example       ✅ Template (safe to commit)
│   ├── config.js          ✅ Loads .env for static HTML
│   ├── index.html         ✅ Loads config.js
│   ├── login.html         ✅ Loads config.js
│   └── assets/
│       └── js/
│           └── api.js     ✅ Uses window.APP_CONFIG
```

---

## Quick Start

### Run Backend
```bash
cd backend
# .env already configured
npm start
# Check: ✓ Supabase (PostgreSQL) connected
```

### Run Frontend
```bash
# Open any HTML file in browser
# config.js loads .env automatically
# All pages use window.APP_CONFIG.apiUrl
```

### Test Configuration
```bash
# Backend
npm run test-db

# Frontend (DevTools Console)
window.APP_CONFIG
window.APP_CONFIG.apiUrl
```

---

## Support

| Issue | Solution |
|-------|----------|
| API URL not loading | Check `frontend/.env` REACT_APP_API_URL |
| Database error | Check `backend/.env` DATABASE_URL |
| CORS error | Check `backend/.env` CORS_ORIGINS |
| Payment failing | Check `frontend/.env` REACT_APP_RAZORPAY_KEY |
| Debug not showing | Set `REACT_APP_DEBUG=true` |

---

**Status**: ✅ Complete — Both backend and frontend environment configuration is properly set up and secured.
