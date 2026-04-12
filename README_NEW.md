# RootToLearn - Platform for Learning Resources

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)

## 📱 Overview

**RootToLearn** is a comprehensive learning platform that provides users with structured educational content, progress tracking, and payment integration for premium features.

### Key Features
- 🔐 **Secure Authentication** - JWT + OTP verification
- 💳 **Payment Integration** - Razorpay for Indian users
- 📊 **Progress Tracking** - User summaries and activity logs
- 👨‍💼 **Admin Dashboard** - Manage users and content
- 📧 **Email Notifications** - OTP via Resend/SMTP
- 🔄 **Rate Limiting** - DDoS protection
- 📱 **Responsive Design** - Mobile-friendly UI

## 🏗️ Tech Stack

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT + OTP
- **Email**: Resend/Nodemailer
- **Payments**: Razorpay API
- **Security**: Helmet.js, Rate Limiting, CORS

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive design
- **JavaScript (Vanilla)** - No dependencies, quick loading
- **Payment**: Razorpay JS SDK

### Infrastructure
- **Hosting**: Render.com (Backend)
- **Database**: Supabase (PostgreSQL)
- **CDN**: Cloudflare (Optional)

## 📦 Installation

### Prerequisites
```bash
# Required
- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL database (Supabase account)
```

### Step 1: Clone & Install Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your configuration
```

### Step 2: Setup Environment Variables

Create `.env` file in backend directory:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
JWT_SECRET=your-super-secret-key
RESEND_API_KEY=your-resend-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### Step 3: Start Backend

```bash
# Development
npm run dev

# Production
npm start
```

Backend will run on `http://localhost:3000`

### Step 4: Setup Frontend

Frontend is static HTML - just serve the `frontend/` directory:

```bash
# Using Python
cd frontend
python -m http.server 8000

# Using Node
npx serve frontend

# Or use any static server
```

## 🔌 API Documentation

### Authentication Endpoints

#### 1. Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "step": "verify",
  "message": "Account created. OTP sent to email."
}
```

#### 2. Login (Send OTP)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongPass123"
}

Response:
{
  "step": "verify",
  "message": "OTP sent to email"
}
```

#### 3. Verify OTP & Login
```http
POST /api/auth/login/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

### All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | Server health check |
| POST | `/api/auth/signup` | ❌ | Create new account |
| POST | `/api/auth/login` | ❌ | Send login OTP |
| POST | `/api/auth/login/verify` | ❌ | Verify OTP login |
| POST | `/api/auth/verify-email` | ❌ | Verify signup email |
| POST | `/api/auth/forgot-password` | ❌ | Request password reset |
| POST | `/api/auth/reset-password` | ❌ | Reset password |
| POST | `/api/auth/resend` | ❌ | Resend OTP |
| GET | `/api/users/me` | ✅ | Get current user |
| PATCH | `/api/users/me` | ✅ | Update user profile |
| POST | `/api/users/change-password` | ✅ | Change password |
| GET | `/api/users/me/summaries` | ✅ | User learning summaries |
| POST | `/api/payments/create-order` | ✅ | Create payment order |
| GET | `/api/payments/history` | ✅ | Payment history |
| POST | `/api/coupons/validate` | ✅ | Validate coupon code |
| GET | `/api/admin/users` | ✅ | List users (admin) |
| GET | `/api/admin/stats` | ✅ | System stats (admin) |

## 🔐 Security Features

### Implemented
- ✅ JWT-based token authentication
- ✅ OTP verification for critical operations
- ✅ Password hashing with bcryptjs
- ✅ CORS protection with origin validation
- ✅ Rate limiting (100 req/15min default)
- ✅ Security headers via Helmet.js
- ✅ Input validation middleware
- ✅ SQL injection prevention (Supabase)
- ✅ HTTPS enforcement (production)

### Recommended
- 🔄 Setup 2FA for admin accounts
- 🔍 Enable database backups
- 📊 Setup monitoring/alerting
- 🚨 Implement audit logging
- 🛡️ Regular security audits

## 📊 Database Schema

### Main Tables
- `users` - User accounts and profiles
- `otp_tokens` - OTP verification tokens
- `payments` - Payment transactions
- `summaries` - User learning progress
- `coupons` - Discount codes
- `activity_logs` - User activity tracking

See `database/schema.sql` for complete schema.

## 🚀 Deployment

### Deploy to Render.com (Backend)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new "Web Service"
4. Connect to GitHub repo
5. Configure environment variables
6. Deploy!

### Deploy to Vercel (Frontend)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import GitHub project
4. Select `frontend/` as root directory
5. Deploy!

## 🧪 Testing

### Manual Testing
```bash
# Test health endpoint
curl https://roottolearn-api.onrender.com/health

# Test signup
curl -X POST https://roottolearn-api.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","name":"Test User"}'
```

### Postman Collection
Import our API collection: [Link to collection]

## 🐛 Troubleshooting

### CORS Errors
**Error**: "Access to fetch blocked by CORS policy"
**Fix**:
1. Check frontend domain in `ALLOWED_ORIGINS`
2. Ensure backend CORS middleware runs first
3. Check API URL in frontend config

### Login Not Working
**Error**: "Network error" or "Invalid credentials"
**Fix**:
1. Check backend is running: `curl localhost:3000/health`
2. Check environment variables: `echo $SUPABASE_URL`
3. Check email service credentials
4. Check database connection

### Database Connection Failed
**Error**: "Cannot connect to database"
**Fix**:
1. Verify SUPABASE_URL format
2. Check SUPABASE_SERVICE_ROLE_KEY
3. Run migrations: See `database/` folder
4. Check network connectivity

## 📚 Documentation Files

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Detailed setup instructions
- [API_DOCS.md](./API_DOCS.md) - Complete API documentation (TODO)
- [DATABASE.md](./DATABASE.md) - Database schema & queries (TODO)
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines (TODO)

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Video streaming integration
- [ ] Advanced analytics dashboard
- [ ] Stripe integration
- [ ] Live class scheduling
- [ ] Certificate generation
- [ ] API rate limiting per user
- [ ] Content recommendation engine

## 📝 Recent Changes (v1.1.0 - April 12, 2026)

### New Features
- ✨ Enhanced CORS configuration with 6+ origin support
- ✨ Input validation middleware for auth routes
- ✨ Health check endpoint at `/health`
- ✨ Standardized response format utility
- ✨ Environment-aware API URL detection
- ✨ Request/response timing logging

### Improvements
- 🔧 Better error handling with detailed messages
- 🔧 Improved frontend fetch with credentials support
- 🔧 Database migration support structure
- 🔧 Enhanced logging with request method & duration
- 🔧 Better environment detection for frontend

### Fixes
- 🐛 Fixed CORS preflight issues
- 🐛 Fixed rate limiting middleware ordering
- 🐛 Improved token refresh logic
- 🐛 Better error messages for debugging

## 📄 License

MIT License - See LICENSE file for details

## 👥 Team

- **Frontend**: [Your Name]
- **Backend**: [Your Name]
- **DevOps**: [Your Name]
- **Product**: [Your Name]

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

```bash
# Fork the repo
# Create feature branch: git checkout -b feature/your-feature
# Commit changes: git commit -am 'Add your feature'
# Push to branch: git push origin feature/your-feature
# Submit a Pull Request
```

## 📞 Support

- **Email**: support@roottolearn.com
- **Issues**: [GitHub Issues](https://github.com/yourrepo/issues)
- **Discord**: [Join Server](https://discord.gg/yourserver)

---

**Made with ❤️ by the RootToLearn Team**
