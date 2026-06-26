import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function tryExecSql() {
  console.log('Reading supabase_featured_products_schema.sql...');
  const sql = fs.readFileSync('supabase_featured_products_schema.sql', 'utf-8');
  
  console.log('Executing schema SQL via rpc exec_sql...');
  let { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('exec_sql failed, trying run_sql...', error);
    const res = await supabase.rpc('run_sql', { sql });
    data = res.data;
    error = res.error;
  }
  
  if (error) {
    console.error('All methods failed executing SQL:', error);
  } else {
    console.log('Schema migration succeeded! Result:', data);
  }
}

tryExecSql();
