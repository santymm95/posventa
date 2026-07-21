import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Error: DATABASE_URL variable is missing in environment.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function initDb() {
  console.log("Conectando a Neon PostgreSQL e inicializando tablas...");

  try {
    // 1. users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        openid VARCHAR(64) UNIQUE NOT NULL,
        name TEXT,
        email VARCHAR(320) UNIQUE,
        password VARCHAR(255),
        loginmethod VARCHAR(64),
        role VARCHAR(50) DEFAULT 'user' NOT NULL,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        lastsignedin TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'users' lista");

    // 2. products
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        image TEXT,
        category VARCHAR(100) DEFAULT 'General' NOT NULL,
        parentproductid INTEGER,
        active INTEGER DEFAULT 1 NOT NULL,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'products' lista");

    // 3. productvariants
    await sql`
      CREATE TABLE IF NOT EXISTS productvariants (
        id SERIAL PRIMARY KEY,
        productid INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price INTEGER,
        active INTEGER DEFAULT 1 NOT NULL,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'productvariants' lista");

    // 4. inventory
    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        productid INTEGER NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        quantity INTEGER NOT NULL,
        previousdayquantity INTEGER DEFAULT 0 NOT NULL,
        sold INTEGER DEFAULT 0 NOT NULL,
        remaining INTEGER NOT NULL,
        notes TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'inventory' lista");

    // 5. sales
    await sql`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        productid INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unitprice INTEGER NOT NULL,
        totalprice INTEGER NOT NULL,
        paymentmethod VARCHAR(50) NOT NULL,
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        notes TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'sales' lista");

    // 6. dailybalance
    await sql`
      CREATE TABLE IF NOT EXISTS dailybalance (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        totalsales INTEGER DEFAULT 0 NOT NULL,
        cashsales INTEGER DEFAULT 0 NOT NULL,
        transfersales INTEGER DEFAULT 0 NOT NULL,
        creditsales INTEGER DEFAULT 0 NOT NULL,
        notes TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'dailybalance' lista");

    // 7. cashclosings
    await sql`
      CREATE TABLE IF NOT EXISTS cashclosings (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        totalsales INTEGER DEFAULT 0 NOT NULL,
        cashsales INTEGER DEFAULT 0 NOT NULL,
        transfersales INTEGER DEFAULT 0 NOT NULL,
        creditsales INTEGER DEFAULT 0 NOT NULL,
        expectedcash INTEGER DEFAULT 0 NOT NULL,
        actualcash INTEGER DEFAULT 0 NOT NULL,
        difference INTEGER DEFAULT 0 NOT NULL,
        notes TEXT,
        closedby TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'cashclosings' lista");

    // 8. settings
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL,
        apptitle VARCHAR(255) DEFAULT 'Asados Ventas' NOT NULL,
        applogo TEXT,
        primarycolor VARCHAR(7) DEFAULT '#dc2626' NOT NULL,
        secondarycolor VARCHAR(7) DEFAULT '#f97316' NOT NULL,
        theme VARCHAR(50) DEFAULT 'light' NOT NULL,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'settings' lista");

    // 9. expenses
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        description TEXT,
        amount INTEGER NOT NULL,
        createdby TEXT,
        createdat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log("✓ Tabla 'expenses' lista");

    console.log("\n¡Todas las tablas fueron creadas exitosamente en Neon PostgreSQL!");
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
    process.exit(1);
  }
}

initDb();
