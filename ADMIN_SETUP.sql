-- ============================================================
-- Fix Admin Account Setup for Supabase
-- ============================================================

-- Step 1: Ensure admins table has all required columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active SMALLINT DEFAULT 1;

-- Step 2: Create or update admin account
-- Password: Admin@123 (hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe)
INSERT INTO admins (name, email, password_hash, role, is_active, created_at)
VALUES (
  'Super Admin',
  'araj821897@gmail.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe',
  'super',
  1,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE 
SET is_active = 1, role = 'super';

-- Step 3: Verify admin account
SELECT id, name, email, role, is_active, created_at FROM admins WHERE email = 'araj821897@gmail.com';

-- Step 4: Ensure OTP table exists and has admin purpose
SELECT COUNT(*) FROM otp_tokens WHERE purpose = 'admin' LIMIT 1;

-- ============================================================
-- Usage for Admin Login:
-- Email: araj821897@gmail.com
-- Password: Admin@123
-- Then enter OTP from email
-- ============================================================
