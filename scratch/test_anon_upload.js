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
  console.log('Testing anonymous upload (no login)...');
  const testBlob = Buffer.from('anon test reservation pdf content');
  const resPath = `reservations/Reservation_SVMS-ANON-${Math.floor(100000 + Math.random() * 900000)}.pdf`;

  const { data: uploadRes, error: uploadErr } = await supabase.storage
    .from('prescriptions')
    .upload(resPath, testBlob, { cacheControl: '3600', contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    console.error('Anonymous upload FAILED:', uploadErr.message, uploadErr);
  } else {
    console.log('Anonymous upload SUCCEEDED!', uploadRes);
    await supabase.storage.from('prescriptions').remove([resPath]);
  }
}

test();
