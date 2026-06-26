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

async function executeSchema() {
  const sql = fs.readFileSync('homepage_sections_schema.sql', 'utf-8');
  console.log('Read homepage_sections_schema.sql. Length:', sql.length);
  
  console.log('Trying rpc exec_sql...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('exec_sql failed:', error);
  } else {
    console.log('exec_sql succeeded:', data);
    return;
  }

  console.log('Trying rpc run_sql...');
  const { data: data2, error: error2 } = await supabase.rpc('run_sql', { sql });
  if (error2) {
    console.error('run_sql failed:', error2);
  } else {
    console.log('run_sql succeeded:', data2);
    return;
  }
  
  console.log('Could not execute schema using standard RPC methods.');
}

executeSchema();
