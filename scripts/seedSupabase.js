import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or key not set in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const priceInCents = 1250000; // 12500 * 100
    const productPayload = {
      name: 'Producto prueba',
      price: priceInCents,
      image: '/uploads/test.jpg',
      category: 'General',
      active: 1,
    };

    console.log('Inserting product...');
    const { data: product, error: prodError } = await supabase.from('products').insert(productPayload).select('*').single();
    if (prodError) {
      console.error('Product insert error:', prodError);
      process.exit(1);
    }
    console.log('Product inserted:', product);

    const today = new Date();
    today.setHours(0,0,0,0);

    // Try inserting inventory; some Supabase schemas use different column names
    const baseInventoryPayloads = [
      { productId: product.id, date: today.toISOString(), quantity: 5, remaining: 5 },
      { productid: product.id, date: today.toISOString(), quantity: 5, remaining: 5 },
      { product_id: product.id, date: today.toISOString(), quantity: 5, remaining: 5 },
    ];

    let inventory = null;
    for (const payload of baseInventoryPayloads) {
      try {
        console.log('Trying inventory payload keys:', Object.keys(payload).join(','));
        const res = await supabase.from('inventory').insert(payload).select('*').single();
        if (res.error) {
          console.warn('Insert failed for keys', Object.keys(payload).join(','), res.error.message || res.error);
          continue;
        }
        inventory = res.data;
        break;
      } catch (e) {
        console.warn('Insert exception for keys', Object.keys(payload).join(','), e);
      }
    }

    if (!inventory) {
      console.error('All inventory insert attempts failed; unable to determine column naming.');
      process.exit(1);
    }

    console.log('Inventory inserted:', inventory);
    console.log('Done. Refresh the client at /inventory and /sales to see the new product.');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
