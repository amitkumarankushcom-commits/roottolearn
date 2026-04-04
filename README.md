# RootToLearn — AI Document Intelligence Platform

## Quick Start (Frontend Only — No Backend Needed)
Open these files directly in your browser:
- `frontend/pages/index.html` — Landing page
- `frontend/pages/app.html` — AI Summarizer (uses Anthropic API directly)
- `frontend/pages/pricing.html` — Pricing & coupons
- `frontend/pages/login.html` — User login with OTP
- `frontend/pages/signup.html` — User registration
- `frontend/pages/profile.html` — User profile
- `frontend/pages/admin-login.html` — **Admin login** (email: admin@roottolearn.app, OTP: 123456)
- `frontend/pages/admin-dashboard.html` — Admin panel (auto-redirects to login)

---

## Full Stack Setup (Frontend + Backend + MySQL)

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```
Default admin: `admin@roottolearn.app` / `Admin@123` — **change immediately!**

### 2. Backend
```bash
cd backend
cp .env.example .env       # Edit with your values
npm install
npm run dev                # Starts on http://localhost:4000
```

### 3. Frontend
Serve with any static server:
```bash
cd frontend
npx serve .                # OR use nginx / Apache
```

---

## Project Structure
```
roottolearn/
├── database/
│   └── schema.sql              ← MySQL tables + seed data
├── backend/
│   ├── server.js               ← Express entry point
│   ├── .env.example            ← Copy to .env and fill in
│   ├── config/
│   │   ├── db.js               ← MySQL connection pool
│   │   └── otp.js              ← OTP generation + email
│   ├── middleware/
│   │   └── auth.js             ← JWT guards for users & admins
│   └── routes/
│       ├── auth.js             ← Signup/Login/OTP/Admin 2FA
│       ├── users.js            ← User profile management
│       ├── summaries.js        ← AI summarization (Claude API)
│       ├── admin.js            ← Admin dashboard API
│       ├── coupons.js          ← Coupon CRUD
│       └── payments.js         ← Stripe integration
└── frontend/
    ├── assets/
    │   ├── css/main.css        ← Shared styles
    │   └── js/
    │       ├── api.js          ← All API calls + token management
    │       └── ads.js          ← AdSense for free users
    └── pages/
        ├── index.html          ← Landing page
        ├── app.html            ← AI summarizer tool
        ├── pricing.html        ← Plans + coupon codes
        ├── login.html          ← User login + OTP
        ├── signup.html         ← Registration + email verify
        ├── profile.html        ← User profile + history
        ├── admin-login.html    ← SEPARATE admin login + 2FA OTP
        └── admin-dashboard.html← Protected admin panel
```

---

## Environment Variables (backend/.env)
| Variable | Description |
|---|---|
| `DB_HOST/USER/PASS/NAME` | MySQL connection |
| `JWT_SECRET` | 64-char random string |
| `REFRESH_SECRET` | Another 64-char random string |
| `SMTP_USER/PASS` | Gmail + App Password for OTP emails |
| `ANTHROPIC_API_KEY` | Claude AI API key |
| `STRIPE_SECRET_KEY` | Stripe payments |

---

## Demo Credentials
| Role | Email | Password | OTP |
|---|---|---|---|
| Admin | admin@roottolearn.app | Admin@123 | 123456 |
| User | any email | any 8+ char password | 123456 |

---

## Ads Setup (Free Users)
1. Apply at **adsense.google.com** with your domain
2. Once approved, update `frontend/assets/js/ads.js`:
   - Replace `ca-pub-XXXXXXXXXXXXXXXX` with your Publisher ID
   - Replace `XXXXXXXXXX` with your Ad Slot ID
3. In admin dashboard → Settings → AdSense, save your IDs

---

## Coupon Codes (Demo)
`SAVE20` · `LAUNCH50` · `STUDENT30` · `FREEMONTH` · `WELCOME15`
