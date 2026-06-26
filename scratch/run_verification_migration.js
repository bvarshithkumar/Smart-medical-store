import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '').replace(/\r$/, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY']; // We can try using the anon key or service role if we have it in .env? Let's check what keys are in .env.

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const sqlPath = path.resolve('verification_service_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration via exec_sql...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('exec_sql failed:', error);
  } else {
    console.log('exec_sql succeeded:', data);
    return;
  }

  console.log('Running migration via run_sql...');
  const { data: data2, error: error2 } = await supabase.rpc('run_sql', { sql });
  if (error2) {
    console.error('run_sql failed:', error2);
  } else {
    console.log('run_sql succeeded:', data2);
    return;
  }
}

runMigration();
