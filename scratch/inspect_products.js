import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qcvbpaokpvhnsqkfxxbp.supabase.co';
const supabaseKey = 'sb_publishable_TfS4U3lAwhh-dnstOjZ0Wg_OvdMKgh5';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProducts() {
  console.log('Fetching all products...');
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, is_active');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Products:', data);
  }
}

inspectProducts();

