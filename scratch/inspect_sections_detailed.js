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

async function inspect() {
  const { data, error } = await supabase.from('homepage_sections').select('*');
  if (error) {
    console.error('Error fetching homepage_sections:', error.message);
    return;
  }
  
  console.log(`Total sections: ${data.length}`);
  data.forEach(sec => {
    console.log(`- Key: ${sec.section_key}, Visible: ${sec.is_visible}, Status: ${sec.status}, Start: ${sec.start_date}, End: ${sec.end_date}`);
  });
}

inspect();
