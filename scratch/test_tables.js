import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '').replace(/\r$/, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'profiles',
  'products',
  'prescriptions',
  'prescription_quotes',
  'quote_change_requests',
  'pickup_reservations',
  'notifications',
  'chat_messages',
  'prescription_medicines',
  'orders',
  'order_items'
];

async function checkAll() {
  console.log('Logging in as admin first...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });
  if (authError) {
    console.error('Login failed:', authError.message);
  } else {
    console.log('Logged in as admin successfully.');
  }

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table}: error -> ${error.message} (${error.code})`);
      } else {
        console.log(`Table ${table}: success -> fetched ${data.length} row(s)`);
      }
    } catch (e) {
      console.log(`Table ${table}: exception -> ${e.message}`);
    }
  }
}

checkAll();
