import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '').replace(/\r$/, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

async function checkSchema() {
  try {
    const url = `${supabaseUrl}/rest/v1/`;
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch schema: ${res.status} ${res.statusText}`);
    }
    const apiDoc = await res.json();
    
    console.log('--- Paths / RPCs ---');
    Object.keys(apiDoc.paths || {}).forEach(path => {
      if (path.startsWith('/rpc/')) {
        console.log(`RPC: ${path}`);
      }
    });
  } catch (err) {
    console.error('Error fetching API doc:', err);
  }
}

checkSchema();
