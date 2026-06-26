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

async function run() {
  console.log('Logging in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }

  console.log('Updating offers section is_visible to true...');
  const { data, error } = await supabase
    .from('homepage_sections')
    .update({ is_visible: true })
    .eq('section_key', 'offers')
    .select();

  if (error) {
    console.error('Update failed:', error.message);
  } else {
    console.log('Successfully enabled offers:', data);
  }
}

run();
