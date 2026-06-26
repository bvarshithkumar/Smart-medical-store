import fs from 'fs';

const supabaseUrl = 'https://qcvbpaokpvhnsqkfxxbp.supabase.co';
const supabaseKey = 'sb_publishable_TfS4U3lAwhh-dnstOjZ0Wg_OvdMKgh5';

async function run() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const data = await response.json();
    
    console.log('Response data:', data);
  } catch (err) {
    console.error(err);
  }
}

run();
