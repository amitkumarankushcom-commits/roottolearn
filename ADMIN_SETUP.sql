-- ============================================================
-- Fix Admin Account Setup for Supabase (PostgreSQL)
-- ============================================================

-- Step 1: Ensure admins table has is_active as BOOLEAN
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Create or update admin account
-- Password: Admin@123 (hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe)
INSERT INTO admins (name, email, password_hash, role, is_active, created_at)
VALUES (
  'Super Admin',
  'araj821897@gmail.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe',
  'super',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE 
SET is_active = true, role = 'super';

-- Step 3: Verify admin account
SELECT id, name, email, role, is_active, created_at FROM admins WHERE email = 'araj821897@gmail.com';

-- Step 4: Check if any OTP records exist
SELECT COUNT(*) as otp_count FROM otp_tokens LIMIT 1;

-- ============================================================
-- Usage for Admin Login:
-- Email: araj821897@gmail.com
-- Password: Admin@123
-- Then enter OTP from email
-- ============================================================
