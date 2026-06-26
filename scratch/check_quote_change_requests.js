import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying quote_change_requests table...');
  const { data, error } = await supabase
    .from('quote_change_requests')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Table quote_change_requests does not exist or error occurred:', error.message);
  } else {
    console.log('Table quote_change_requests exists! Row count sample:', data.length);
  }
}

check();
