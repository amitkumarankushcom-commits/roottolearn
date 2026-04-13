-- ============================================================
--  Add session_token column to users table
--  Purpose: Single-device login — only one active session per user
--  Usage: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_token VARCHAR(64) DEFAULT NULL;
