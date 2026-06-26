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
  console.log('Logging in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }

  const { data, error } = await supabase.from('homepage_sections').select('*').eq('section_key', 'offers');
  console.log('Offers query result (as Admin):', data, error);
}

test();
