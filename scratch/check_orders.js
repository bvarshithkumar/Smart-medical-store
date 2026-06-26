const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/a sai sathwik/Downloads/rocking/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    // 1. Check orders table
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (orderError) {
      console.error('Error fetching orders:', orderError);
    } else {
      console.log('Orders columns:', orderData.length > 0 ? Object.keys(orderData[0]) : 'No rows');
      if (orderData.length === 0) {
        // Try getting schema through empty select
        const { data: cols } = await supabase.from('orders').select('*').limit(0);
        console.log('Orders empty query structure:', cols);
      }
    }

    // 2. Check order_items table
    const { data: itemData, error: itemError } = await supabase
      .from('order_items')
      .select('*')
      .limit(1);

    if (itemError) {
      console.error('Error fetching order_items:', itemError);
    } else {
      console.log('Order_items columns:', itemData.length > 0 ? Object.keys(itemData[0]) : 'No rows');
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}

check();
