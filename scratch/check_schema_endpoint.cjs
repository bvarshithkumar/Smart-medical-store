const fs = require('fs');

const envContent = fs.readFileSync('c:/Users/a sai sathwik/Downloads/rocking/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
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
    
    console.log('API Doc fetched successfully.');
    
    // 1. Inspect orders definition
    const ordersDef = apiDoc.definitions?.orders;
    if (ordersDef) {
      console.log('--- Orders definition columns ---');
      Object.entries(ordersDef.properties || {}).forEach(([colName, prop]) => {
        console.log(`- ${colName}: ${prop.type} (${prop.format || ''}) ${prop.description || ''}`);
      });
    } else {
      console.log('Orders table definition not found.');
    }

    // 2. Inspect order_items definition
    const itemsDef = apiDoc.definitions?.order_items;
    if (itemsDef) {
      console.log('--- Order_items definition columns ---');
      Object.entries(itemsDef.properties || {}).forEach(([colName, prop]) => {
        console.log(`- ${colName}: ${prop.type} (${prop.format || ''}) ${prop.description || ''}`);
      });
    } else {
      console.log('Order_items table definition not found.');
    }

  } catch (err) {
    console.error('Error fetching API doc:', err);
  }
}

checkSchema();
