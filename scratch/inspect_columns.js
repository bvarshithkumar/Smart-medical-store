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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('Testing select for qr_data...');
  const { error: errorData } = await supabase
    .from('pickup_reservations')
    .select('qr_data')
    .limit(1);
  console.log('qr_data error:', errorData ? errorData.message : 'No error (column exists!)');

  console.log('Testing select for qr_payload...');
  const { error: errorPayload } = await supabase
    .from('pickup_reservations')
    .select('qr_payload')
    .limit(1);
  console.log('qr_payload error:', errorPayload ? errorPayload.message : 'No error (column exists!)');
}

check();
