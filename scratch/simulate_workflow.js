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

// Customer credentials
const customerEmail = 'customer_test_1234@gmail.com';
const customerPassword = 'password123';

// Admin credentials
const adminEmail = 'admin@svms.com';
const adminPassword = 'Admin@1234';

async function run() {
  const customerClient = createClient(supabaseUrl, supabaseKey);
  const adminClient = createClient(supabaseUrl, supabaseKey);

  console.log('1. Logging in as customer...');
  const { data: custAuth, error: custAuthErr } = await customerClient.auth.signInWithPassword({
    email: customerEmail,
    password: customerPassword
  });
  if (custAuthErr) {
    console.error('Customer login failed:', custAuthErr.message);
    return;
  }
  const customerUser = custAuth.user;
  console.log('Customer logged in, ID:', customerUser.id);

  console.log('\n2. Logging in as admin...');
  const { data: admAuth, error: admAuthErr } = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });
  if (admAuthErr) {
    console.error('Admin login failed:', admAuthErr.message);
    return;
  }
  console.log('Admin logged in.');

  // Find prescription uploaded by customer
  console.log('\n3. Finding prescription...');
  const { data: rxList, error: rxErr } = await adminClient
    .from('prescriptions')
    .select('*')
    .eq('user_id', customerUser.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (rxErr || !rxList || rxList.length === 0) {
    console.error('No prescription found:', rxErr ? rxErr.message : 'Empty');
    return;
  }
  const prescription = rxList[0];
  console.log('Found Prescription ID:', prescription.id, 'Status:', prescription.status);

  // Generate a quote (as admin)
  console.log('\n4. Admin generating quote...');
  const quoteNumber = 'QT-' + Math.floor(100000 + Math.random() * 900000);
  const { data: quote, error: quoteErr } = await adminClient
    .from('prescription_quotes')
    .insert({
      prescription_id: prescription.id,
      quote_number: quoteNumber,
      total_amount: 120.50,
      status: 'Quote Generated',
      quote_pdf_url: 'https://example.com/quote.pdf',
      version_number: 1,
      is_active: true,
      quote_status: 'active'
    })
    .select()
    .single();

  if (quoteErr) {
    console.error('Failed to create quote:', quoteErr.message, quoteErr);
    return;
  }
  console.log('Quote created successfully, ID:', quote.id, 'Number:', quote.quote_number);

  // Admin sends the quote (updates prescription status and quote status)
  console.log('\n5. Admin sending quote...');
  const { error: sendRxErr } = await adminClient
    .from('prescriptions')
    .update({ status: 'quote_sent' })
    .eq('id', prescription.id);
  if (sendRxErr) {
    console.error('Failed to update prescription status to quote_sent:', sendRxErr.message);
    return;
  }
  
  const { error: sendQErr } = await adminClient
    .from('prescription_quotes')
    .update({ status: 'Quote Sent', sent_to_dashboard: true, sent_at: new Date().toISOString() })
    .eq('id', quote.id);
  if (sendQErr) {
    console.error('Failed to update quote status to Quote Sent:', sendQErr.message);
    return;
  }
  console.log('Quote sent successfully.');

  // Customer accepts the quote (simulate client confirming slot)
  console.log('\n6. Customer confirming pickup slot...');
  
  // 6a. Upload PDF to Storage (as customer)
  console.log('Uploading PDF receipt to Storage...');
  const pdfBlob = Buffer.from('mock pdf content');
  const pdfPath = `reservations/Reservation_TEST_123.pdf`;
  const { error: uploadErr } = await customerClient.storage
    .from('prescriptions')
    .upload(pdfPath, pdfBlob, { cacheControl: '3600', contentType: 'application/pdf', upsert: true });
  if (uploadErr) {
    console.error('Storage upload failed:', uploadErr.message, uploadErr);
  } else {
    console.log('Storage upload succeeded.');
  }

  // 6b. Insert into pickup_reservations (as customer)
  console.log('Inserting into pickup_reservations...');
  const testOrderId = 'SVMS-ORDER-' + Math.floor(100000 + Math.random() * 900000);
  const { data: resData, error: resError } = await customerClient
    .from('pickup_reservations')
    .insert({
      reservation_id: testOrderId,
      user_id: customerUser.id,
      customer_name: 'Customer Test',
      phone_number: '9876501234',
      medicines: [{ id: 'c0066550-0000-4000-a000-000000000003', qty: 1, name: 'Kof-Kure Cough Syrup', price: 85 }],
      total_amount: 120.50,
      pickup_date: '2026-06-27',
      pickup_time: '11:00 AM',
      status: 'Accepted By Customer',
      qr_payload: testOrderId,
      receipt_url: 'https://example.com/receipt.pdf',
      prescription_id: prescription.id,
      created_at: new Date().toISOString()
    })
    .select();

  if (resError) {
    console.error('pickup_reservations insert failed:', resError.message, resError);
  } else {
    console.log('pickup_reservations insert succeeded!', resData);
  }

  // 6c. Update prescriptions status (as customer)
  console.log('Updating prescription status to accepted_by_customer...');
  const { data: rxUpdateData, error: rxUpdateErr } = await customerClient
    .from('prescriptions')
    .update({ status: 'accepted_by_customer' })
    .eq('id', prescription.id)
    .select();

  if (rxUpdateErr) {
    console.error('prescriptions update failed:', rxUpdateErr.message, rxUpdateErr);
  } else {
    console.log('prescriptions update succeeded! Count:', rxUpdateData.length, rxUpdateData);
  }

  // 6d. Insert notifications (as customer)
  console.log('Inserting notifications as customer...');
  const { error: notiErr1 } = await customerClient.from('notifications').insert({
    user_id:         customerUser.id,
    title:           'Reservation Approved',
    message:         'Your reservation has been booked.',
    type:            'reservation_approved',
    prescription_id: prescription.id,
    quote_id:        quote.id,
    is_read:         false,
    read:            false
  });
  if (notiErr1) {
    console.error('Notification 1 failed:', notiErr1.message, notiErr1);
  } else {
    console.log('Notification 1 succeeded.');
  }

  // Admin notification (user_id is null)
  const { error: notiErr2 } = await customerClient.from('notifications').insert({
    user_id:         null,
    title:           'Quote Accepted',
    message:         'Customer accepted quote.',
    type:            'quote_accepted',
    prescription_id: prescription.id,
    quote_id:        quote.id,
    is_read:         false,
    read:            false
  });
  if (notiErr2) {
    console.error('Notification 2 failed:', notiErr2.message, notiErr2);
  } else {
    console.log('Notification 2 succeeded.');
  }
}

run();
