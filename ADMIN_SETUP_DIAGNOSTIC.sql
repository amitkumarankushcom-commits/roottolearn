-- ============================================================
-- ADMIN ACCOUNT DIAGNOSTIC AND SETUP FOR SUPABASE
-- ============================================================

-- Step 1: Check if admin account exists
SELECT 'ADMIN EXISTS' as check, id, email, role, is_active, password_hash 
FROM admins 
WHERE LOWER(email) = LOWER('araj821897@gmail.com')
LIMIT 1;

-- Step 2: If not found, the above returns empty
-- Run this to create the admin account fresh:

-- DELETE the old one if it exists (uncomment if needed)
-- DELETE FROM admins WHERE LOWER(email) = LOWER('araj821897@gmail.com');

-- Now INSERT the admin with correct password hash
-- Password: Admin@123
-- Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe
INSERT INTO admins (name, email, password_hash, role, is_active, created_at)
VALUES (
  'Super Admin',
  'araj821897@gmail.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe',
  'super',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) 
DO UPDATE SET 
  password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMrCOFJa3iCmFHIh9yCfxQBe',
  role = 'super',
  is_active = true;

-- Step 3: Verify the admin account
SELECT 'FINAL CHECK' as status, id, email, role, is_active 
FROM admins 
WHERE LOWER(email) = LOWER('araj821897@gmail.com');

-- ============================================================
-- If Step 1 returns no rows: admin doesn't exist, need to create
-- If Step 3 shows is_active=false: need to set is_active=true
-- Otherwise admin account is correctly set up
-- ============================================================

-- Admin Login Credentials:
-- Email: araj821897@gmail.com
-- Password: Admin@123
-- ⚠️ CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!
