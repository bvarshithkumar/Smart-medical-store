/**
 * COMPLETE AUDIT SCRIPT
 * =====================
 * Run: node scratch/audit_complete.js
 *
 * Checks:
 *  1. Storage bucket existence & public flag
 *  2. All active storage RLS policies
 *  3. All active pickup_reservations RLS policies
 *  4. Simulates a customer upload to reservations/
 *  5. Simulates a pickup_reservations INSERT as a customer
 *
 * Replace TEST_EMAIL / TEST_PASSWORD with a real customer account.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ── Load .env ─────────────────────────────────────────────────────────────────
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) {
    env[line.slice(0, eqIdx).trim()] = line.slice(eqIdx + 1).trim().replace(/\r$/, '').replace(/(^['"]|['"]$)/g, '');
  }
});

const SUPABASE_URL      = env['VITE_SUPABASE_URL'];
const SUPABASE_ANON_KEY = env['VITE_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// ── FILL IN YOUR TEST CUSTOMER CREDENTIALS ────────────────────────────────────
const TEST_EMAIL    = 'customer_test_1234@gmail.com';   // ← change if needed
const TEST_PASSWORD = 'password123';                     // ← change if needed

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function section(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(' ' + title);
  console.log('═'.repeat(60));
}

async function main() {
  section('1. ANON ROLE — STORAGE BUCKET CHECK');
  const { data: buckets, error: bErr } = await anonClient.storage.listBuckets();
  if (bErr) {
    console.error('  listBuckets() error (anon):', bErr.message);
    console.log('  ℹ️  This is normal — anon role cannot list buckets via API.');
  } else {
    console.log('  Buckets visible to anon:', buckets.map(b => b.name));
    const prx = buckets.find(b => b.name === 'prescriptions');
    if (prx) {
      console.log('  ✅ prescriptions bucket found. public:', prx.public);
    } else {
      console.log('  ⚠️  "prescriptions" bucket NOT visible to anon key.');
    }
  }

  // ── 2. LOGIN AS CUSTOMER ───────────────────────────────────────────────────
  section('2. CUSTOMER LOGIN');
  const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
    email:    TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authErr || !authData?.user) {
    console.error('  ❌ Customer login FAILED:', authErr?.message);
    console.log('  Cannot proceed without a real authenticated session.');
    process.exit(1);
  }

  const userId = authData.user.id;
  const jwt    = authData.session?.access_token;
  console.log('  ✅ Logged in as customer');
  console.log('  user.id      :', userId);
  console.log('  user.email   :', authData.user.email);
  console.log('  role in token:', authData.user.role);
  console.log('  JWT present  :', !!jwt);

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  });

  // ── 3. STORAGE — ATTEMPT RESERVATION PDF UPLOAD ───────────────────────────
  section('3. STORAGE UPLOAD — reservations/ path');
  const testId  = `SVMS-TEST-${Date.now()}`;
  const pdfPath = `reservations/Reservation_${testId}.pdf`;
  const pdfBlob = Buffer.from(`%PDF-1.4 TEST RESERVATION ${testId}`);

  console.log('  bucket_id   :', 'prescriptions');
  console.log('  upload path :', pdfPath);
  console.log('  auth.uid()  :', userId);
  console.log('  blob size   :', pdfBlob.length, 'bytes');

  const { data: upData, error: upErr } = await authedClient.storage
    .from('prescriptions')
    .upload(pdfPath, pdfBlob, {
      contentType:  'application/pdf',
      cacheControl: '3600',
      upsert: false,        // use false first — avoids UPDATE path
    });

  if (upErr) {
    console.error('\n  ❌ Storage upload FAILED:', upErr.message);
    console.error('  Full error object:', JSON.stringify(upErr, null, 2));
    const isRLS = upErr.message?.includes('row-level security')
               || upErr.statusCode === '403'
               || upErr.status    === 400;
    if (isRLS) {
      console.error('\n  🔴 ROOT CAUSE: Storage RLS is blocking this INSERT.');
      console.error('  The "customer_upload_policy" may be missing or malformed.');
      console.error('  Run rls_minimal_fix.sql or rls_storage_fix.sql in the Supabase SQL Editor.');
    }
  } else {
    console.log('\n  ✅ Storage upload SUCCEEDED:', upData);

    // cleanup
    await authedClient.storage.from('prescriptions').remove([pdfPath]);
    console.log('  Cleanup: removed test file.');
  }

  // ── 4. DATABASE INSERT — pickup_reservations ───────────────────────────────
  section('4. DATABASE INSERT — pickup_reservations');
  const reservationPayload = {
    reservation_id: testId,
    user_id:        userId,          // MUST equal auth.uid() per RLS policy
    customer_name:  'Audit Test Customer',
    phone_number:   '9999999999',
    medicines:      [{ id: 'test-1', name: 'Test Med', qty: 1, price: 10 }],
    total_amount:   10,
    pickup_date:    new Date().toISOString().split('T')[0],
    pickup_time:    '10:00 AM',
    status:         'Pending',
    qr_payload:     testId,
  };

  console.log('  Payload user_id:', reservationPayload.user_id);
  console.log('  auth.uid() is  :', userId);
  console.log('  Match?         :', reservationPayload.user_id === userId);

  const { data: insData, error: insErr } = await authedClient
    .from('pickup_reservations')
    .insert(reservationPayload)
    .select();

  if (insErr) {
    console.error('\n  ❌ DB INSERT FAILED:', insErr.message);
    console.error('  Full error:', JSON.stringify(insErr, null, 2));
    const isRLS = insErr.message?.includes('row-level security')
               || insErr.code === '42501';
    if (isRLS) {
      console.error('\n  🔴 ROOT CAUSE: pickup_reservations RLS is blocking INSERT.');
      console.error('  Run rls_minimal_fix.sql in the Supabase SQL Editor.');
    }
  } else {
    console.log('\n  ✅ DB INSERT SUCCEEDED:', insData);
    // cleanup
    const { error: delErr } = await authedClient
      .from('pickup_reservations')
      .delete()
      .eq('reservation_id', testId);
    if (delErr) {
      console.warn('  Cleanup failed (might need admin to delete):', delErr.message);
    } else {
      console.log('  Cleanup: deleted test row.');
    }
  }

  // ── 5. CHECK CURRENT RLS POLICIES (using service key if available) ─────────
  section('5. CURRENT RLS POLICY NAMES (anon read from information_schema)');
  const { data: policies, error: polErr } = await authedClient
    .rpc('get_policies_debug')
    .throwOnError()
    .catch(() => ({ data: null, error: { message: 'RPC get_policies_debug not available (expected)' } }));

  if (polErr) {
    console.log('  ℹ️ Cannot read pg_policies via anon key — this is normal.');
    console.log('  Verify policies in Supabase Dashboard → Authentication → Policies.');
    console.log('  Expected policies on pickup_reservations:');
    console.log('    - user_select_own_reservations (SELECT)');
    console.log('    - user_insert_own_reservations (INSERT)');
    console.log('    - user_update_own_reservations (UPDATE)');
    console.log('    - admin_all_reservations       (ALL)');
    console.log('  Expected policies on storage.objects (prescriptions bucket):');
    console.log('    - admin_prescriptions_all  (ALL)');
    console.log('    - customer_upload_policy   (INSERT)');
    console.log('    - anon_upload_prescriptions(INSERT)');
    console.log('    - customer_read_policy     (SELECT)');
    console.log('    - anon_read_policy         (SELECT)');
    console.log('    - customer_update_policy   (UPDATE)');
    console.log('    - customer_delete_policy   (DELETE)');
  }

  console.log('\n' + '═'.repeat(60));
  console.log(' AUDIT COMPLETE');
  console.log('═'.repeat(60));
}

main().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
