-- PostgreSQL SQL for Supabase
-- Run this in Supabase Dashboard → SQL Editor → New Query

-- Update users with NULL or empty names
UPDATE users 
SET 
  name = COALESCE(NULLIF(name, ''), split_part(email, '@', 1)),
  plan = COALESCE(NULLIF(plan, ''), 'free')
WHERE name IS NULL OR name = '';

-- Verify the updates
SELECT id, email, name, plan FROM users WHERE email = 'sumitldh1234@gmail.com';
