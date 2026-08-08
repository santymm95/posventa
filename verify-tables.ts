import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const url = process.env.DATABASE_URL!;

async function verify() {
  console.log('Connecting to Neon to verify tables...');
  const sql = neon(url);
  try {
    const tables = ['users', 'products', 'inventory', 'sales', 'dailybalance', 'cashclosings', 'settings', 'expenses'];
    for (const table of tables) {
      const rows = await sql(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`Table '${table}': ${rows[0].count} rows`);
    }

    console.log('\n--- Sample Users ---');
    const users = await sql`SELECT id, openid, name, email, role FROM users`;
    console.log(users);

    console.log('\n--- Sample Products ---');
    const products = await sql`SELECT id, name, price, category FROM products`;
    console.log(products);

  } catch (error) {
    console.error('Error verifying:', error);
  }
}

verify();
