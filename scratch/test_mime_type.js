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
  console.log('Logging in...');
  await supabase.auth.signInWithPassword({
    email: 'customer_test_1234@gmail.com',
    password: 'password123'
  });

  const testBlob = Buffer.from('test content');

  // Upload without specifying contentType
  const resPath = `reservations/TestMime_${Math.floor(10000 + Math.random() * 90000)}.pdf`;
  console.log('Uploading without contentType...');
  const { data, error } = await supabase.storage
    .from('prescriptions')
    .upload(resPath, testBlob, { cacheControl: '3600', upsert: true });

  if (error) {
    console.error('Upload without contentType FAILED:', error.message, error);
  } else {
    console.log('Upload without contentType SUCCEEDED!', data);
    await supabase.storage.from('prescriptions').remove([resPath]);
  }
}

test();
