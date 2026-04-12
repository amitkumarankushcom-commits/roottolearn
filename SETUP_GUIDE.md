# RootToLearn - Complete Setup Guide

## 📋 Project Overview

RootToLearn is a full-stack web application with:
- **Backend**: Express.js API with JWT authentication and OTP verification
- **Frontend**: Static HTML with responsive design
- **Database**: Supabase (PostgreSQL)
- **Payments**: Razorpay integration
- **Email**: OTP-based authentication via Resend or SMTP

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL database (Supabase)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env

# Fill in your environment variables in .env

# Start development server
npm run dev

# Start production server
npm start
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Edit config.js with your API URL
# The config detects environment automatically:
# - Localhost → http://localhost:4000/api
# - Production → https://roottolearn-api.onrender.com/api

# Serve with any static server (Python, Node, etc)
# For local testing, you can use:
# python -m http.server 8000
# or
# npx serve .
```

## 🔐 Security Features

✅ JWT-based authentication
✅ OTP verification for login/signup
✅ CORS protection with origin validation
✅ Rate limiting (100 requests/15 min)
✅ Helmet.js for security headers
✅ bcryptjs for password hashing
✅ Input validation middleware
✅ SQL injection prevention (via Supabase)

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required variables:
- `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` - Database
- `JWT_SECRET` - Token signing key
- `RESEND_API_KEY` - Email service
- `RAZORPAY_*` - Payment gateway

### CORS Configuration

Frontend origins already configured:
- `http://localhost:3000`
- `https://roottolearn.com`
- `https://www.roottolearn.com`
- and more...

To add more origins, update `backend/server.js`:

```javascript
const allowedOrigins = [
  'https://your-domain.com'
];
```

## 📁 Project Structure

```
RootToLearn/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── package.json           # Dependencies
│   ├── config/                # Configuration
│   │   ├── db.js
│   │   ├── supabase.js
│   │   └── otp.js
│   ├── middleware/            # Middleware
│   │   ├── auth.js
│   │   └── validation.js
│   ├── routes/                # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── payments.js
│   │   └── ...
│   └── utils/                 # Utilities
│       └── response.js
├── frontend/
│   ├── index.html             # Home page
│   ├── login.html             # Login page
│   ├── signup.html            # Signup page
│   ├── config.js              # Frontend config
│   └── assets/
│       ├── css/               # Stylesheets
│       └── js/                # JavaScript files
└── database/
    ├── schema.sql             # Database schema
    └── migrations/            # Migration files
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Send OTP
- `POST /api/auth/login/verify` - Verify OTP and login
- `POST /api/auth/verify-email` - Verify signup email
- `POST /api/auth/forgot-password` - Reset password request
- `POST /api/auth/reset-password` - Complete password reset

### User
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update user profile
- `POST /api/users/change-password` - Change password

### Payments
- `POST /api/payments/create-order` - Create payment order
- `GET /api/payments/history` - Payment history

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/stats` - System statistics

## 🧪 Testing

### Local Testing
1. Start backend: `npm run dev` (in backend/)
2. Start frontend: Serve frontend/ on localhost
3. Test with Postman or browser console

### CORS Testing
```javascript
// In browser console
fetch('https://roottolearn-api.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## 🚀 Deployment

### Backend (Render.com)
1. Push to GitHub
2. Connect repository to Render
3. Set environment variables in Render dashboard
4. Deploy automatically on push

### Frontend (Vercel/Netlify)
1. Push to GitHub
2. Connect to Vercel/Netlify
3. Deploy automatically on push

## 📋 Checklist Before Production

- [ ] Update JWT_SECRET with strong key
- [ ] Setup Razorpay production keys
- [ ] Configure SMTP/Resend for production email
- [ ] Update ALLOWED_ORIGINS with production domain
- [ ] Run database migrations
- [ ] Test login flow end-to-end
- [ ] Test payment flow
- [ ] Setup monitoring/logging
- [ ] Enable HTTPS (automatic on Render/Vercel)
- [ ] Review security headers
- [ ] Setup backup strategy

## 🐛 Troubleshooting

### CORS Error on Login
**Problem**: "Access to fetch blocked by CORS policy"
**Solution**: 
1. Check frontend domain is in `ALLOWED_ORIGINS`
2. Ensure API accepts `credentials: include`
3. Check browser console for actual error message

### "No 'Access-Control-Allow-Origin' header"
**Solution**:
1. Verify backend CORS middleware is loaded first
2. Check `app.options('*', cors(corsOptions))` exists
3. Restart backend server

### JWT Token Expired
**Solution**: Frontend auto-refreshes tokens via `/api/auth/refresh`
- If still failing, clear sessionStorage and login again

### Database Connection Failed
**Solution**:
1. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
2. Check network connectivity
3. Verify database tables exist (run migration)

## 📚 Documentation

- Database Schema: See `database/schema.sql`
- API Documentation: Use Postman collection (TODO)
- Frontend Guide: See `frontend/README.md` (TODO)

## 🔄 Recent Updates (2026-04-12)

✨ **New Features & Improvements:**
- Enhanced CORS configuration with multiple origin support
- Added input validation middleware for auth routes
- Improved error handling with standardized responses
- Better logging with request/response timing
- Added health check endpoint
- Environment-aware API URL detection
- Enhanced frontend fetch with credentials
- Database migration support for schema improvements
- Response utility for standardized API responses

## 📝 License

MIT

## 👥 Support

For issues, please create a GitHub issue or contact the development team.
