import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const tables = ['dailybalance', 'cashclosings', 'settings'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    console.log(`--- ${table} ---`);
    if (error) {
      console.error('ERROR', error.message);
    } else if (data && data.length > 0) {
      console.log('FOUND row', JSON.stringify(data[0], null, 2));
    } else {
      console.log('TABLE exists and is empty or has no rows');
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
