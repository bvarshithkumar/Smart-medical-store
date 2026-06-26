import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('Inspecting notifications table columns...');
  
  // Try querying different columns to see what works
  const cols = ['id', 'user_id', 'title', 'message', 'read', 'is_read', 'type', 'related_id', 'created_at'];
  
  for (const col of cols) {
    const { error } = await supabase
      .from('notifications')
      .select(col)
      .limit(1);
    if (error) {
      console.log(`Column '${col}': DOES NOT EXIST (${error.message})`);
    } else {
      console.log(`Column '${col}': EXISTS`);
    }
  }
}

check();
