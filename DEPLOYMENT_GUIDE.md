# 🚀 VERCEL + RENDER + SUPABASE DEPLOYMENT GUIDE

## Overview
- **Frontend**: Vercel (Static HTML/CSS/JS)
- **Backend**: Render (Express.js + Node.js)
- **Database**: Supabase (PostgreSQL)

---

## STEP 1: Supabase Setup (Database)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database initialization (5-10 min)
4. Go to **Settings → Database** and copy:
   - **DATABASE_URL** (Connection string)
   - **Project URL** (for SUPABASE_URL)
   - **Anon Public Key** (for SUPABASE_PUBLISHABLE_DEFAULT_KEY)

### 1.2 Initialize Database
Run locally first to test:
```bash
cd backend
DATABASE_URL="your-supabase-url" node setup-db.js
```

---

## STEP 2: Backend Deployment (Render)

### 2.1 Push to GitHub
```bash
cd backend
git init
git add .
git commit -m "Backend ready for Render"
git remote add origin https://github.com/YOUR_USERNAME/roottolearn-backend.git
git push -u origin main
```

### 2.2 Deploy to Render
1. Go to [render.com](https://render.com)
2. Click **New → Web Service**
3. Connect GitHub repo
4. Fill details:
   - **Name**: roottolearn-api
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

### 2.3 Set Environment Variables in Render Dashboard
Copy all from `backend/.env.render` and add to Render:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Supabase connection string |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Your anon public key |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `FRONTEND_URL` | `https://roottolearn.vercel.app` (update with your Vercel URL) |
| `CORS_ORIGINS` | `https://roottolearn.vercel.app,https://www.roottolearn.com` |
| Other keys | (Email, Payment gateway, AI services) |

### 2.4 Get Your Backend URL
After deployment, Render gives you URL like:
```
https://roottolearn-api.onrender.com
```

Copy this for Step 3.

---

## STEP 3: Frontend Deployment (Vercel)

### 3.1 Update Frontend Config
Update `frontend/.env`:
```env
APP_API_URL=https://roottolearn-api.onrender.com/api
```
(Replace with your actual Render backend URL)

### 3.2 Push to GitHub
```bash
cd frontend
git init
git add .
git commit -m "Frontend ready for Vercel"
git remote add origin https://github.com/YOUR_USERNAME/roottolearn-frontend.git
git push -u origin main
```

### 3.3 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Import GitHub repository
4. Vercel auto-detects static site
5. Click **Deploy**

### 3.4 Vercel Environment Variables (Optional)
Dashboard → **Settings → Environment Variables**:
```
APP_API_URL = https://roottolearn-api.onrender.com/api
```

---

## STEP 4: Verify Deployment

### 4.1 Test Backend
```bash
curl https://roottolearn-api.onrender.com/health
```
Expected response: `{"status":"ok","database":"connected"}`

### 4.2 Test Frontend
1. Open https://roottolearn.vercel.app in browser
2. Open DevTools **Console**
3. Type: `window.APP_CONFIG`
4. Should show:
```javascript
{
  env: 'production',
  apiUrl: 'https://roottolearn-api.onrender.com/api',
  // ... other config
}
```

### 4.3 Test API Connection
In browser console:
```javascript
fetch(window.APP_CONFIG.apiUrl + '/health').then(r => r.json()).then(console.log)
```
Should return: `{status: "ok", database: "connected"}`

---

## File Structure After Setup

```
RootToLearn/
├── backend/
│   ├── .env                  ← Local dev (PRIVATE - never commit)
│   ├── .env.render          ← Template for Render (can commit)
│   ├── render.yaml          ← Render deployment config
│   ├── server.js
│   ├── setup-db.js
│   ├── package.json
│   ├── routes/
│   ├── config/
│   └── middleware/
├── frontend/
│   ├── .env                 ← Local dev (PRIVATE - never commit)
│   ├── vercel.json          ← Vercel deployment config
│   ├── config.js            ← Environment loader
│   ├── index.html
│   ├── *.html              ← All HTML pages
│   └── assets/
└── DATABASE/
    └── schema.sql          ← Run with setup-db.js
```

---

## Environment Variables Checklist

### Backend (.env on Render):
- [ ] NODE_ENV = `production`
- [ ] DATABASE_URL = Supabase connection string
- [ ] SUPABASE_URL, SUPABASE_PUBLISHABLE_DEFAULT_KEY
- [ ] JWT_SECRET, REFRESH_SECRET (64-char hex strings)
- [ ] EMAIL_HOST, EMAIL_USER, EMAIL_PASS (Gmail SMTP)
- [ ] RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
- [ ] FRONTEND_URL = Vercel domain
- [ ] CORS_ORIGINS = Vercel domain + custom domains

### Frontend (.env on Vercel):
- [ ] APP_ENV = `production`
- [ ] APP_API_URL = Render backend URL
- [ ] APP_RAZORPAY_KEY = Razorpay test/live key
- [ ] APP_ENABLE_* = true/false for features

---

## Troubleshooting

### CORS Error
**Error**: "Access to XMLHttpRequest blocked by CORS"
**Fix**: Update `CORS_ORIGINS` in backend to include Vercel domain

### API 404 Error
**Error**: "Failed to fetch from /api/..."
**Fix**: Check `APP_API_URL` in frontend/.env points to correct Render domain

### Database Connection Error
**Error**: "FATAL: database connection failed"
**Fix**: Verify `DATABASE_URL` is correct in Render environment variables

### Config Not Loading
**Error**: `window.APP_CONFIG` is undefined
**Fix**: Open browser console, check if `.env` file exists in frontend root

---

## Updating Code After Deployment

### Backend Changes
```bash
cd backend
git add .env (only if private .env changed locally)
git commit -m "Backend update"
git push origin main
# Render auto-deploys from GitHub
```

### Frontend Changes
```bash
cd frontend
git add .
git commit -m "Frontend update"
git push origin main
# Vercel auto-deploys from GitHub
```

---

## 🔐 Security Checklist

- [ ] `.env` files are in `.gitignore` (never commit credentials)
- [ ] Backend environment variables set only in Render dashboard
- [ ] Frontend `.env` contains only PUBLIC keys (Razorpay, Stripe)
- [ ] Database backups enabled in Supabase
- [ ] JWT secrets are 64+ character random strings
- [ ] Email password is Gmail App Password (not account password)

---

## Support

For issues:
1. Check Render logs: Render dashboard → Service → Logs
2. Check Vercel logs: Vercel dashboard → Project → Deployments
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly
