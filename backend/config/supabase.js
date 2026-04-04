// ============================================================
//  backend/config/supabase.js — Centralized Supabase Client
// ============================================================
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
  throw new Error('[ERR] Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY
);

module.exports = supabase;