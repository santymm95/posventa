import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Supabase URL or key not set in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function inspectTable(tableName) {
  console.log(`\n--- Inspecting Table: ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Failed to select from ${tableName}:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`Found row in ${tableName}:`, JSON.stringify(data[0], null, 2));
  } else {
    console.log(`Table ${tableName} exists but is empty.`);
  }
}

async function fetchSwaggerDocs() {
  console.log('\n--- Fetching PostgREST Schema definition via Swagger ---');
  try {
    const response = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const swagger = await response.json();
    console.log('Tables defined in API:');
    for (const [path, definition] of Object.entries(swagger.paths)) {
      if (path === '/') continue;
      const cleanPath = path.replace('/', '');
      console.log(`\nTable: ${cleanPath}`);
      const postParams = definition.post?.parameters || [];
      const bodyParam = postParams.find(p => p.in === 'body');
      if (bodyParam && bodyParam.schema && bodyParam.schema.properties) {
        console.log('Columns:');
        for (const [colName, colProp] of Object.entries(bodyParam.schema.properties)) {
          console.log(`  - ${colName} (${colProp.type})`);
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch swagger definition:', e.message);
  }
}

async function run() {
  const tables = ["users", "products", "inventory", "sales", "dailyBalance", "cashClosings", "settings"];
  for (const table of tables) {
    await inspectTable(table);
  }
  await fetchSwaggerDocs();
}

run();
