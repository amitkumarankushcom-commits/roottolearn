  const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SERVICE_ROLE_KEY:", SUPABASE_KEY ? "OK" : "MISSING");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase ENV variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});     

// Test connection
supabase
  .from('users')
  .select('COUNT(*)', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
    } else {
      console.log('✅ Supabase (PostgreSQL) connected');
    }
  })
  .catch(err => {
    console.error('❌ Supabase connection error:', err.message);
  });

  module.exports = supabase;