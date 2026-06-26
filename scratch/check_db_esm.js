import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qcvbpaokpvhnsqkfxxbp.supabase.co';
const supabaseKey = 'sb_publishable_TfS4U3lAwhh-dnstOjZ0Wg_OvdMKgh5';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking Anon Select ---');
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*');
    
    if (error) {
      console.error('Anon Select Error:', error);
    } else {
      console.log('Anon Select Success, Row Count:', data?.length);
      console.log('Anon Select Data:', data);
    }
  } catch (err) {
    console.error('Anon Select Exception:', err);
  }

  console.log('\n--- Logging in as Admin (admin@svms.com) ---');
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@svms.com',
      password: 'Admin@1234'
    });

    if (authError) {
      console.error('Auth Error:', authError.message);
      return;
    }

    console.log('Auth Success! Logged in user ID:', authData.user.id);

    // Check profiles table role
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileErr) {
      console.error('Profile query error:', profileErr.message);
    } else {
      console.log('Profile Role:', profile?.role);
    }

    console.log('\n--- Checking Authenticated Select ---');
    const { data: rxData, error: rxError } = await supabase
      .from('prescriptions')
      .select('*');

    if (rxError) {
      console.error('Authenticated Select Error:', rxError);
    } else {
      console.log('Authenticated Select Success, Row Count:', rxData?.length);
      console.log('Authenticated Select Data:', rxData);
    }
  } catch (err) {
    console.error('Authenticated Select Exception:', err);
  }
}

check();
