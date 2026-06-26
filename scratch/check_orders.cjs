const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('c:/Users/a sai sathwik/Downloads/rocking/.env', 'utf8');
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
  try {
    console.log('Logging in as admin...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@svms.com',
      password: 'Admin@1234'
    });
    if (authError) {
      console.error('Login failed:', authError.message);
    } else {
      console.log('Login success as:', authData.user.id);
    }

    const userId = authData?.user?.id;
    console.log('Using user_id:', userId);

    const testOrderId = '00000000-0000-4000-a000-000000000000';

    // Insert dummy order to get schema and clean it up immediately
    const { data: insertData, error: insertError } = await supabase
      .from('orders')
      .insert({
        id: testOrderId,
        order_number: 'ORD-test',
        user_id: userId,
        status: 'Reservation Received',
        pickup_date: 'Today',
        pickup_time: '12:00 PM',
        total_amount: 0
      })
      .select('*');

    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Successfully inserted test order! Columns:');
      console.log(Object.keys(insertData[0] || {}));

      // Let's get products first to get a valid product_id
      const { data: products } = await supabase.from('products').select('id').limit(1);
      const prodId = products?.length > 0 ? products[0].id : null;
      
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: testOrderId,
          product_id: prodId,
          quantity: 1
        })
        .select('*');

      if (itemError) {
        console.error('Order Item Insert Error:', itemError);
      } else {
        console.log('Successfully inserted order item! Columns:');
        console.log(Object.keys(itemData[0] || {}));
      }
      
      // Clean up
      const { error: delErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', testOrderId);
      console.log('Cleaned up test order. Delete error:', delErr);
    }

  } catch (err) {
    console.error('Catch error:', err);
  }
}

check();
