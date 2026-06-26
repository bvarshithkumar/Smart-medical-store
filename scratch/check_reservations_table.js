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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const testId = '00000000-0000-4000-a000-000000000000';
  const { data, error } = await supabase
    .from('pickup_reservations')
    .insert({
      id: testId,
      reservation_id: 'SVMS-TEST-001',
      customer_name: 'Test Customer',
      phone_number: '1234567890',
      medicines: [{ id: 'test', name: 'Test Med', qty: 1 }],
      total_amount: 100.00,
      pickup_date: '2026-06-21',
      pickup_time: '12:00 PM',
      status: 'Pending',
      qr_data: 'SVMS-TEST-001'
    })
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success! Columns:', Object.keys(data[0] || {}));
    const { error: delErr } = await supabase
      .from('pickup_reservations')
      .delete()
      .eq('id', testId);
    console.log('Delete status:', delErr ? 'failed: ' + delErr.message : 'success');
  }
}

check();
