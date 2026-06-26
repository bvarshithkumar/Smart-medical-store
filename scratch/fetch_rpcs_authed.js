import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '').replace(/\r$/, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL.trim();
const supabaseKey = env.VITE_SUPABASE_ANON_KEY.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Logging in to get JWT token...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@svms.com',
      password: 'Admin@1234'
    });

    if (authError) {
      throw new Error(`Auth failed: ${authError.message}`);
    }

    const token = authData.session.access_token;
    console.log('Login success. Token obtained.');

    const url = `${supabaseUrl}/rest/v1/`;
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText} - ${body}`);
    }
    const apiDoc = await res.json();
    
    console.log('--- RPCs list ---');
    Object.keys(apiDoc.paths || {}).forEach(path => {
      if (path.startsWith('/rpc/')) {
        console.log(`RPC: ${path}`);
      }
    });

    console.log('--- Definitions list (Tables/Views) ---');
    console.log(Object.keys(apiDoc.definitions || {}));
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();
