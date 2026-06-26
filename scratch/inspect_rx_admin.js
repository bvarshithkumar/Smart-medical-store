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

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });

  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('id', '96057403-7b48-4c9d-8798-6250466d202a')
    .single();

  console.log('Prescription details as Admin:', error ? error : data);
}

test();
