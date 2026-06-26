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
  console.log('Logging in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@svms.com',
    password: 'Admin@1234'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  console.log('Admin logged in.');

  console.log('\n--- Checking Buckets ---');
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error('Failed to list buckets:', bucketsErr.message, bucketsErr);
  } else {
    console.log('Available buckets:');
    buckets.forEach(b => {
      console.log(`- ID: ${b.id}, Name: ${b.name}, Public: ${b.public}, FileSizeLimit: ${b.file_size_limit}`);
    });
  }

  console.log('\n--- Listing files in prescriptions bucket root ---');
  const { data: rootFiles, error: rootFilesErr } = await supabase.storage
    .from('prescriptions')
    .list('', { limit: 10 });
  if (rootFilesErr) {
    console.error('Failed to list files in root:', rootFilesErr.message, rootFilesErr);
  } else {
    console.log(`Found ${rootFiles.length} files in root:`, rootFiles.map(f => f.name));
  }

  console.log('\n--- Listing files in prescriptions bucket reservations/ folder ---');
  const { data: resFiles, error: resFilesErr } = await supabase.storage
    .from('prescriptions')
    .list('reservations', { limit: 10 });
  if (resFilesErr) {
    console.error('Failed to list files in reservations/:', resFilesErr.message, resFilesErr);
  } else {
    console.log(`Found ${resFiles.length} files in reservations/:`, resFiles.map(f => f.name));
  }
}

test();
