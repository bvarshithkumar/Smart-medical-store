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
  console.log('Checking if homepage_sections table exists...');
  
  const { data, error } = await supabase.from('homepage_sections').select('*');
  if (error) {
    console.log(`Table "homepage_sections": NOT PRESENT or error: ${error.message}`);
  } else {
    console.log(`Table "homepage_sections": EXISTS. Row count check:`, data.length);
    console.log('Row sample keys:', data.map(r => r.section_key));
  }
}

test();
