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
  console.log('Checking if CMS tables exist...');
  
  const tables = [
    'cms_hero', 'cms_categories', 'cms_quick_actions', 'cms_offers', 
    'cms_tips', 'cms_testimonials', 'cms_pharmacist', 'cms_banners', 'cms_brands'
  ];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table "${t}": NOT PRESENT or RLS error: ${error.message}`);
    } else {
      console.log(`Table "${t}": EXISTS. Row count check:`, data.length);
    }
  }
}

test();
