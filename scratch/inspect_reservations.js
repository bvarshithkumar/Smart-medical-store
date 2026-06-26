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

async function inspect() {
  const { data: prescriptions, error } = await supabase
    .from('prescriptions')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching prescriptions:', error);
  } else {
    console.log('Sample prescriptions:', JSON.stringify(prescriptions, null, 2));
  }
}

inspect();
