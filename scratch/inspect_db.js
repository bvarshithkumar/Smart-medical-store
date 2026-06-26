import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'exists' : 'missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  // Test query on products
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching product:', error);
  } else {
    console.log('Sample product columns:', products && products[0] ? Object.keys(products[0]) : 'None');
    console.log('Sample product:', products && products[0]);
  }

  // Check columns of quote_change_requests
  const { data: changes, error: changeErr } = await supabase
    .from('quote_change_requests')
    .select('*')
    .limit(1);

  if (changeErr) {
    console.error('Error fetching change request:', changeErr);
  } else {
    console.log('Sample change request columns:', changes && changes[0] ? Object.keys(changes[0]) : 'None');
    console.log('Sample change request:', changes && changes[0]);
  }
}

inspect();
