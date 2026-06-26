import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '').replace(/\r$/, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- SVMS Workflow Verification Script ---');

  // Let's test listing from quote_change_requests (to check if table exists now, or if it needs sql run)
  try {
    const { data: testData, error: testErr } = await supabase
      .from('quote_change_requests')
      .select('*')
      .limit(1);

    if (testErr) {
      console.log('Verification NOTE: quote_change_requests table is not created in Supabase yet. Please execute STEP 9 SQL in Supabase SQL editor.');
    } else {
      console.log('Verification Success: quote_change_requests table is present and accessible!');
    }
  } catch (e) {
    console.error('Exception checking table:', e.message);
  }

  // Let's check quotes count operation
  try {
    const { count, error } = await supabase
      .from('prescription_quotes')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error counting quotes:', error.message);
    } else {
      console.log(`Success: Found ${count} quotes in the prescription_quotes table.`);
    }
  } catch (e) {
    console.error('Exception counting quotes:', e.message);
  }

  console.log('--- Verification Done ---');
}

run();
