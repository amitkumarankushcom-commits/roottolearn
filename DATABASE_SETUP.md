# RootToLearn Database Setup Guide

## Current Status

Your backend has been updated to **handle missing database columns gracefully**. However, for full functionality, you should add the missing columns to your Supabase instance.

## Quick Fix: Add Missing Columns (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/projects)
2. Select your `RootToLearn` project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run This SQL
Copy and paste this SQL script:

```sql
-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP DEFAULT NULL;
```

### Step 3: Execute
Click the **Run** button (or Ctrl+Enter)

✅ Expected result: `Query executed successfully`

---

## Complete Setup: Use Master Schema (10 minutes)

For a fresh or complete database setup:

### Option A: Full Database Rebuild
If you're starting fresh or want everything in one go:

1. Open **SQL Editor → New Query**
2. Copy entire content from `database/schema-complete.sql`
3. Paste it into the SQL Editor
4. Click **Run**

### Option B: Add Individual Components
If you want to add tables incrementally:

```sql
-- Add audit logging tables
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Add email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(100) UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `database/schema.sql` | Core schema (PostgreSQL) |
| `database/schema-mysql.sql` | MySQL version (if needed) |
| `database/schema-complete.sql` | **ALL tables + indexes + seed data (RECOMMENDED)** |
| `database/migration-2026-04-12-improvements.sql` | Performance improvements |
| `database/migrate-add-forgot.sql` | OTP forgot password support |

---

## Troubleshooting

### Problem: 500 Error on Login Verification
**Status**: ✅ Fixed in backend code (graceful fallback)
**Solution**: Run the SQL script above to add missing columns

### Problem: OTP Not Being Sent
1. Check backend environment variables:
   - `RESEND_API_KEY` - Email API key
   - `FROM_EMAIL` - Sender email address
   - `OTP_EXPIRY_MINUTES` - Default: 15 minutes

2. Check Supabase authentication:
   - Row Level Security (RLS) policies on `otp_tokens` table

### Problem: "User not found" After OTP
1. Verify user record exists: Check in Supabase → `users` table
2. Check OTP verification: Look for logs in server terminal
3. Run the missing columns SQL script above

---

## Next Steps

1. ✅ Run the SQL script to add missing columns
2. 🧪 Test login flow end-to-end
3. 📝 Review `backend/routes/auth.js` for any customizations
4. 🔐 Change default admin password immediately (see schema seed data)

---

## Important Security Notes

⚠️ **Change these immediately in production:**

1. Admin default password (currently: `Admin@123`)
   - Update in `database/schema-complete.sql` line with:
   - `password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe'`

2. JWT Secret (`process.env.JWT_SECRET`)
   - Set strong, unique value in Render environment

3. Resend API Key (`process.env.RESEND_API_KEY`)
   - Required for OTP emails

---

Last Updated: April 12, 2026
