require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

// Shared client for database, storage and admin actions. It is never used to sign anyone in.
const supabase = createClient(supabaseUrl, supabaseKey, options);

// A fresh client for every sign-in, sign-up or password reset,
// so one user's session can never leak into the shared client.
function authClient() {
  return createClient(supabaseUrl, supabaseKey, options);
}

module.exports = { supabase, authClient };