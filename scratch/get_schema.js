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

async function checkSchema() {
  try {
    const url = `${supabaseUrl}/rest/v1/`;
    console.log('Fetching schema from:', url);
    console.log('Using key starting with:', supabaseKey.substring(0, 10));
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
    console.log('Exposed Tables/Views in definitions:');
    console.log(Object.keys(apiDoc.definitions || {}));
  } catch (err) {
    console.error('Error fetching API doc:', err);
  }
}

checkSchema();
