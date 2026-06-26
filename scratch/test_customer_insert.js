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

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Logging in as customer...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'customer_test_1234@gmail.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const user = authData.user;
  console.log('Customer User ID:', user.id);

  // 1. Try insert into pickup_reservations
  console.log('\n--- 1. Testing insert into pickup_reservations ---');
  const testResId = 'SVMS-TEST-' + Math.floor(1000 + Math.random() * 9000);
  const { data: resData, error: resError } = await supabase
    .from('pickup_reservations')
    .insert({
      reservation_id: testResId,
      user_id: user.id,
      customer_name: 'Customer Test',
      phone_number: '9876501234',
      medicines: [{ id: 'c0066550-0000-4000-a000-000000000003', qty: 1, name: 'Kof-Kure Cough Syrup', price: 85 }],
      total_amount: 85.00,
      pickup_date: '2026-06-26',
      pickup_time: '12:00 PM',
      status: 'Accepted By Customer',
      qr_payload: testResId,
      created_at: new Date().toISOString()
    })
    .select();

  if (resError) {
    console.error('pickup_reservations insert failed:', resError.message, resError);
  } else {
    console.log('pickup_reservations insert succeeded!', resData);
    // Cleanup
    await supabase.from('pickup_reservations').delete().eq('reservation_id', testResId);
  }

  // 2. Try update prescriptions
  console.log('\n--- 2. Testing update on prescriptions ---');
  // Let's find a prescription owned by this user
  const { data: rxList, error: rxFindErr } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (rxFindErr) {
    console.error('Failed to find prescriptions:', rxFindErr.message);
  } else if (rxList.length === 0) {
    console.log('No prescriptions found for this user. Cannot test update.');
  } else {
    const rxId = rxList[0].id;
    console.log('Updating prescription status for ID:', rxId);
    const { data: rxData, error: rxError } = await supabase
      .from('prescriptions')
      .update({ status: 'accepted_by_customer' })
      .eq('id', rxId)
      .select();

    if (rxError) {
      console.error('prescriptions update failed:', rxError.message, rxError);
    } else {
      console.log('prescriptions update succeeded!', rxData);
    }
  }
}

test();
