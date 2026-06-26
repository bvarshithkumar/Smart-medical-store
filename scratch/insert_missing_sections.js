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

  console.log('Inserting offers section...');
  const { data, error } = await supabase.from('homepage_sections').insert([
    {
      section_key: 'offers',
      section_name: 'Promotional Offers',
      section_title: "Today's Deals",
      section_subtitle: 'Save big on wellness essentials and chronic medicines.',
      display_order: 50,
      max_items: 4,
      layout_type: 'grid',
      sort_type: 'manual',
      desktop_layout: '2 columns',
      mobile_layout: 'horizontal scroll',
      background_color: 'transparent',
      padding_top: 45,
      padding_bottom: 45
    }
  ]).select();

  if (error) {
    console.error('Insert failed:', error.message);
  } else {
    console.log('Successfully inserted offers:', data);
  }
}

run();
