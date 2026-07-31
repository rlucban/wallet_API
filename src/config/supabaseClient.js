require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL in environment variables.');
}

const keyToUse = serviceKey || anonKey;

if (!serviceKey) {
  console.warn("⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Using ANON_KEY instead. Database RLS policies may block backend operations (e.g., Registration). Please add SUPABASE_SERVICE_ROLE_KEY to your Vercel/local .env variables.");
}

try {
    new URL(supabaseUrl);
} catch (err) {
    throw new Error(`Invalid SUPABASE_URL: "${supabaseUrl}"`);
}

const supabase = createClient(supabaseUrl, keyToUse);

console.log(`[Supabase] Client initialized. Mode: ${serviceKey ? "SERVICE_ROLE (Admin Bypassing RLS)" : "ANON_KEY (Restricted by RLS)"}`);

module.exports = supabase;
