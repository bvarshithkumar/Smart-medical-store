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
  console.log('Logging in as customer...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'customer_test_1234@gmail.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Customer login failed:', authError.message);
    return;
  }
  const user = authData.user;
  console.log('Customer logged in, ID:', user.id);

  const testBlob = Buffer.from('customer test reservation pdf content');
  
  // 1. Try uploading to reservations/
  const resPath = `reservations/Reservation_SVMS-${Math.floor(100000 + Math.random() * 900000)}.pdf`;
  console.log(`\n--- 1. Testing customer upload to: ${resPath} ---`);
  const { data: uploadRes, error: uploadErr } = await supabase.storage
    .from('prescriptions')
    .upload(resPath, testBlob, { cacheControl: '3600', contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    console.error('Customer upload FAILED:', uploadErr.message, uploadErr);
  } else {
    console.log('Customer upload SUCCEEDED!', uploadRes);
    // Try reading it back
    console.log('\n--- 2. Testing customer read of own file ---');
    const { data: readRes, error: readErr } = await supabase.storage
      .from('prescriptions')
      .download(resPath);
    if (readErr) {
      console.error('Customer read FAILED:', readErr.message);
    } else {
      console.log('Customer read SUCCEEDED! Content length:', readRes.size);
    }

    // Try deleting it
    console.log('\n--- 3. Testing customer delete of own file ---');
    const { data: delRes, error: delErr } = await supabase.storage
      .from('prescriptions')
      .remove([resPath]);
    if (delErr) {
      console.error('Customer delete FAILED:', delErr.message);
    } else {
      console.log('Customer delete SUCCEEDED!', delRes);
    }
  }

  // 4. Try uploading to prescriptions root (which should fail)
  const rootPath = `Reservation_ROOT_${Math.floor(100000 + Math.random() * 900000)}.pdf`;
  console.log(`\n--- 4. Testing customer upload to root: ${rootPath} (should fail) ---`);
  const { data: rootRes, error: rootErr } = await supabase.storage
    .from('prescriptions')
    .upload(rootPath, testBlob, { cacheControl: '3600', contentType: 'application/pdf', upsert: true });
  if (rootErr) {
    console.log('Customer upload to root FAILED (expected):', rootErr.message);
  } else {
    console.error('Customer upload to root SUCCEEDED (unexpected!):', rootRes);
    await supabase.storage.from('prescriptions').remove([rootPath]);
  }
}

test();
