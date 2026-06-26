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
  console.log('Checking admin user...');
  
  // Try signing in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });
  
  if (error) {
    console.error('Sign in failed:', error.message);
    return;
  }
  
  console.log('Sign in succeeded. User UID:', data.user.id);
  
  // Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    console.log('We should probably insert a profile for this user.');
  } else {
    console.log('Profile found:', profile);
  }
}

test();
