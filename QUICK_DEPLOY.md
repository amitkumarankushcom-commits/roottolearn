# 🎯 Quick Deployment Reference — RENDER + SUPABASE

## TLDR - What Goes Where

```
FRONTEND (HTML/CSS/JS)
  ↓
  Deploy to: NETLIFY
  Folder: frontend/
  URL: yourdomain.com

BACKEND (Node.js + Express)
  ↓
  Deploy to: RENDER
  Folder: backend/
  URL: api.yourdomain.com

DATABASE (PostgreSQL)
  ↓
  Deploy to: SUPABASE
  What: database/schema.sql
```

---

## 📋 COMPLETE DEPLOYMENT GUIDE

### ⚙️ STEP 1: Supabase Database (10 min)

#### Create Project
1. Go to **https://supabase.com** → Sign up/Login
2. Click **New Project**
3. Name: `roottolearn`
4. Choose region closest to you
5. Create a strong password
6. Wait for provisioning (1-2 min)

#### Get Connection String
1. In Supabase Dashboard → **Settings** → **Database**
2. Copy URL under "Connection string" (look for `postgresql://...`)
3. It looks like: `postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres`
4. **SAVE THIS** (you need it for Render)

#### Setup Database Schema
1. Go to **SQL Editor** (left sidebar)
2. Click **New query** 
3. Open file: `database/schema.sql` in your project
4. Copy ALL content
5. Paste into Supabase SQL Editor
6. Click **Run** ✓

### 🚀 STEP 2: Render Backend (15 min)

#### Create Web Service on Render
1. Go to **https://render.com** → Sign up/Login
2. Click **New +** → **Web Service**
3. Choose **Connect a repository** (GitHub)
4. Find your GitHub repo: `RootToLearn`
5. Click **Connect**

#### Configure Service
1. **Name:** `roottolearn-api`
2. **Environment:** Node
3. **Region:** Choose close to users (US recommended)
4. **Branch:** main
5. **Build Command:** `npm install`
6. **Start Command:** `node server.js`
7. **Instance Type:** Free (or Starter)

#### Add Environment Variables
Click **Add Environment Variable** for each:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | Your Supabase connection string |
| `JWT_SECRET` | Generate 32+ char random string |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `RATE_LIMIT_MAX` | `100` |
| `OTP_EXPIRY_MINUTES` | `15` |
| `OTP_MAX_ATTEMPTS` | `5` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | Your email |
| `EMAIL_PASS` | Gmail app password |
| `RAZORPAY_KEY_ID` | Your Razorpay key |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret |
| `STRIPE_SECRET_KEY` | Your Stripe key (if using) |

#### Deploy
1. Scroll down → Click **Create Web Service**
2. Render will auto-deploy
3. **SAVE the URL** from dashboard (e.g., `https://roottolearn-api.onrender.com`)

### 🌐 STEP 3: Netlify Frontend (5 min)

#### Update API URL
1. Open `frontend/assets/js/api.js`
2. Find line with `return 'https://roottolearn-api.onrender.com/api'`
3. Replace `roottolearn-api.onrender.com` with your actual Render URL
4. **Commit & Push** to GitHub

#### Deploy to Netlify
1. Go to **https://netlify.com** → Sign up/Login
2. Click **Add new site** → **Import an existing project**
3. Choose GitHub
4. Select your `RootToLearn` repo
5. **Base directory:** `frontend`
6. **Build command:** (leave empty)
7. **Publish directory:** `frontend`
8. Click **Deploy site**

---

## 🔑 How to Generate Secrets

### JWT_SECRET
```powershell
# In terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Razorpay Keys
1. Go to **https://dashboard.razorpay.com**
2. **Settings** → **API Keys**
3. Copy Key ID and Key Secret

### Gmail App Password
1. Go to **myaccount.google.com** → **Security**
2. Enable 2-Step Verification
3. **App passwords** → Select Mail + Windows Computer
4. Copy the 16-char password

---

## 📦 Environment Variables Complete List

```
# DEPLOYMENT
NODE_ENV=production
PORT=3000

# DATABASE (Supabase)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres

# AUTH & SECURITY
JWT_SECRET=abc123def456...min32chars...
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# API RATE LIMITING
RATE_LIMIT_MAX=100

# OTP SETTINGS
OTP_EXPIRY_MINUTES=15
OTP_MAX_ATTEMPTS=5

# EMAIL NOTIFICATIONS
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx

# PAYMENTS
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXX (optional)

# SUPABASE ADDITIONAL (if needed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-key
```



---

## 📁 Files by Deployment Target

### 📦 NETLIFY → frontend/
```
✅ INCLUDE:
  ├── index.html
  ├── app.html
  ├── login.html
  ├── signup.html
  ├── forgot.html
  ├── pricing.html
  ├── profile.html
  ├── admin-login.html
  ├── admin-dashboard.html
  ├── assets/css/      (all .css files)
  └── assets/js/       (all .js files)

❌ EXCLUDE:
  ├── backend/
  ├── database/
  ├── .env
  ├── node_modules/
  ├── .git/
  └── Screenshots/
```

### 📦 RENDER → backend/
```
✅ INCLUDE:
  ├── server.js
  ├── package.json
  ├── config/
  │   ├── db.js
  │   ├── otp.js
  │   └── supabase.js
  ├── middleware/
  │   └── auth.js
  ├── routes/
  │   ├── auth.js
  │   ├── users.js
  │   ├── payments.js
  │   ├── coupons.js
  │   ├── summaries.js
  │   ├── admin.js
  │   └── uploads.js

❌ EXCLUDE (Auto-ignored):
  ├── .env              (handled via Render env vars)
  ├── node_modules/     (auto installed)
  ├── test_*.js         (test files)
  ├── .git/
  ├── database/         (only for Supabase SQL Editor)
  └── frontend/         (deployed separately)
```

### 📦 SUPABASE → SQL Editor
```
✅ RUN IN SQL EDITOR:
  database/schema.sql
  └── Contains all table definitions
      - users, otp_tokens, coupons
      - summaries, activity_logs
      - payment_history, admin_logs

❌ DO NOT USE:
  schema-mysql.sql     (MySQL only, not needed for Supabase)
  seed-activity-log.sql (optional, for testing data)
```

---

## ✅ Pre-Deployment Checklist

### Github & Code
- [ ] Git repo: `yourusername/RootToLearn`
- [ ] `.gitignore` includes `.env`
- [ ] `.gitignore` includes `node_modules/`
- [ ] No `.env` file committed to git
- [ ] Latest code committed & pushed

### Backend Code
- [ ] `backend/server.js` has no syntax errors
- [ ] `backend/package.json` lists all dependencies
- [ ] Tested locally: `npm install && npm run dev`
- [ ] All routes working in local testing
- [ ] API endpoints responding correctly

### Frontend Code
- [ ] `frontend/assets/js/api.js` updated with correct API URL
- [ ] All HTML files reference correct CSS/JS files
- [ ] No broken image links
- [ ] Mobile responsive (check on phone)

### Credentials Ready
- [ ] ✅ Supabase DATABASE_URL copied
- [ ] ✅ JWT_SECRET generated (32+ chars)
- [ ] ✅ Gmail app password created
- [ ] ✅ Razorpay keys copied
- [ ] ✅ Stripe keys (if using)

---

## 🧪 Testing Locally Before Deploy

### Start Backend
```powershell
cd backend
npm install
npm run dev
```
Expected: Server starts on `http://localhost:4000`

### Test API Endpoints
```powershell
# Test auth
curl http://localhost:4000/api/auth/register -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123"}'

# Test health
curl http://localhost:4000/health
```

### Check Frontend
```powershell
cd frontend
# Open index.html in browser
start index.html
```

---

## 🐛 Troubleshooting

### **Render shows build error**
- Check `backend/package.json` has all dependencies
- Verify DATABASE_URL format is correct
- Check Node version compatibility (18+)

### **Can't connect to Supabase**
- Verify CONNECTION string (not REST API URL)
- Make sure database/schema.sql was run
- Check Supabase firewall allows your Render IP

### **Auth not working**
- Verify JWT_SECRET is in Render env vars
- Check otp_tokens table exists in Supabase
- Verify EMAIL_USER and EMAIL_PASS are correct

### **Frontend can't reach backend**
- Update `frontend/assets/js/api.js` with correct Render URL
- Check CORS_ORIGINS in Render env vars
- Verify frontend domain is in CORS_ORIGINS list

### **Payment failing**
- Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
- Check if test/live keys are correct
- Confirm Razorpay account is verified

---

## 📞 Support Resources

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Express.js:** https://expressjs.com/

---

**Last Updated:** April 2026
**Status:** Production Ready ✅

### Frontend Ready
- [ ] `frontend/assets/js/api.js` has correct API_URL
- [ ] All HTML files load without errors
- [ ] No console errors when tested locally

### Database Ready
- [ ] Supabase project created
- [ ] DATABASE_URL copied
- [ ] Confident schema.sql will load

---

## Deployment Order

1. **Setup Supabase** (database must be ready first)
2. **Deploy Backend** (backend needs database connection)
3. **Deploy Frontend** (frontend needs backend API running)
4. **Test Everything** (full end-to-end test)

---

## Test After Deployment

```bash
# Test backend is running
curl https://api.yourdomain.com/

# Test database connected
curl https://api.yourdomain.com/api/admin/stats

# Test frontend loads
curl https://yourdomain.com/

# Test API call from frontend
Open browser → yourdomain.com → Check console for API calls
```

---

## Troubleshooting Links

- **Backend logs:** Railway dashboard → Deployments → View logs
- **Database:** Supabase dashboard → SQL Editor / Database / Logs
- **Frontend logs:** Browser DevTools → Console tab
- **Domain issues:** Netlify/Railway DNS settings

---

## Common Mistakes to Avoid

❌ Pushing `.env` to GitHub  
❌ Using MySQL DATABASE_URL for Supabase  
❌ Frontend API_URL pointing to localhost  
❌ Database not initialized before backend deploy  
❌ Wrong CORS_ORIGINS in backend  
❌ Forgetting JWT_SECRET in production env vars  

---

## Support

- **Netlify help:** netlify.com/docs
- **Supabase help:** supabase.com/docs
- **Railway help:** railway.app/docs
- **Render help:** render.com/docs
