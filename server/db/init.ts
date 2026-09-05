import 'dotenv/config';
import { sql, isPg } from './conn';


export async function initializeDatabase(): Promise<void> {
  if (!sql) {
    console.warn('No database configuration found. Skipping schema initialization.');
    return;
  }

  if (isPg) {
    console.log('[PostgreSQL] Initializing schema...');
    
    try {
      await Promise.all([
        sql`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            openid VARCHAR(64) UNIQUE NOT NULL,
            name TEXT,
            email VARCHAR(320) UNIQUE,
            password VARCHAR(255),
            loginmethod VARCHAR(64),
            role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            lastsignedin TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            image TEXT,
            category VARCHAR(100) NOT NULL DEFAULT 'General',
            parentproductid INTEGER,
            active INTEGER NOT NULL DEFAULT 1,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS productvariants (
            id SERIAL PRIMARY KEY,
            productid INTEGER NOT NULL,
            name VARCHAR(255) NOT NULL,
            price INTEGER,
            active INTEGER NOT NULL DEFAULT 1,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS inventory (
            id SERIAL PRIMARY KEY,
            productid INTEGER NOT NULL,
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            quantity INTEGER NOT NULL,
            previousdayquantity INTEGER NOT NULL DEFAULT 0,
            sold INTEGER NOT NULL DEFAULT 0,
            remaining INTEGER NOT NULL,
            notes TEXT,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS sales (
            id SERIAL PRIMARY KEY,
            productid INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unitprice INTEGER NOT NULL,
            totalprice INTEGER NOT NULL,
            paymentmethod VARCHAR(50) NOT NULL,
            date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS dailybalance (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL,
            totalsales INTEGER NOT NULL DEFAULT 0,
            cashsales INTEGER NOT NULL DEFAULT 0,
            transfersales INTEGER NOT NULL DEFAULT 0,
            creditsales INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS cashclosings (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL,
            totalsales INTEGER NOT NULL DEFAULT 0,
            cashsales INTEGER NOT NULL DEFAULT 0,
            transfersales INTEGER NOT NULL DEFAULT 0,
            creditsales INTEGER NOT NULL DEFAULT 0,
            expectedcash INTEGER NOT NULL DEFAULT 0,
            actualcash INTEGER NOT NULL DEFAULT 0,
            difference INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            closedby VARCHAR(100),
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            userid INTEGER NOT NULL,
            apptitle VARCHAR(255) NOT NULL DEFAULT 'Asados Ventas',
            applogo TEXT,
            primarycolor VARCHAR(7) NOT NULL DEFAULT '#dc2626',
            secondarycolor VARCHAR(7) NOT NULL DEFAULT '#f97316',
            theme VARCHAR(50) NOT NULL DEFAULT 'light',
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        sql`
          CREATE TABLE IF NOT EXISTS expenses (
            id SERIAL PRIMARY KEY,
            date TIMESTAMP NOT NULL,
            description TEXT,
            amount INTEGER NOT NULL,
            createdby INTEGER,
            createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
      ]);
    } catch (e) {
      console.warn('[PostgreSQL] Non-fatal error initializing tables:', e);
    }

    console.log('[PostgreSQL] Database schema is ready. Seeding if needed...');

    // Auto-seed Admin User
    const adminCheck = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    if (adminCheck.length === 0) {
      console.log('[PostgreSQL] Seeding default admin user...');
      await sql`
        INSERT INTO users (openid, name, email, loginmethod, role)
        VALUES ('admin-001', 'Administrador', 'admin@gmail.com', 'local', 'admin')
      `;
    }

    // Auto-seed default products
    const productsCheck = await sql`SELECT id FROM products LIMIT 1`;
    if (productsCheck.length === 0) {
      console.log('[PostgreSQL] Seeding default products...');
      await sql`
        INSERT INTO products (name, description, price, category, active) VALUES
        ('Chorizos Asados', 'Chorizos asados frescos', 600000, 'asado', 1),
        ('Chorizos Crudos', 'Chorizos crudos para cocinar', 350000, 'crudo', 1),
        ('Picadas', 'Tabla de picadas variadas', 2500000, 'picada', 1),
        ('Choriperros', 'Chorizos con pan tipo perro caliente', 700000, 'choriperro', 1),
        ('Chuzos', 'Chuzos de carne asada', 600000, 'chuzo', 1)
      `;
    }
  } else {
    console.log('[MySQL] Initializing schema...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) UNIQUE NOT NULL,
        name TEXT,
        email VARCHAR(320) UNIQUE,
        password VARCHAR(255),
        loginMethod VARCHAR(64),
        role ENUM('user','admin') NOT NULL DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        image TEXT,
        category VARCHAR(100) NOT NULL DEFAULT 'General',
        parentProductId INTEGER,
        active INTEGER NOT NULL DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS productVariants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price INTEGER,
        active INTEGER NOT NULL DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INTEGER NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        quantity INTEGER NOT NULL,
        previousDayQuantity INTEGER NOT NULL DEFAULT 0,
        sold INTEGER NOT NULL DEFAULT 0,
        remaining INTEGER NOT NULL,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice INTEGER NOT NULL,
        totalPrice INTEGER NOT NULL,
        paymentMethod VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS dailyBalance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        totalSales INTEGER NOT NULL DEFAULT 0,
        cashSales INTEGER NOT NULL DEFAULT 0,
        transferSales INTEGER NOT NULL DEFAULT 0,
        creditSales INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cashClosings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        totalSales INTEGER NOT NULL DEFAULT 0,
        cashSales INTEGER NOT NULL DEFAULT 0,
        transferSales INTEGER NOT NULL DEFAULT 0,
        creditSales INTEGER NOT NULL DEFAULT 0,
        expectedCash INTEGER NOT NULL DEFAULT 0,
        actualCash INTEGER NOT NULL DEFAULT 0,
        difference INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        closedBy TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INTEGER NOT NULL,
        appTitle VARCHAR(255) NOT NULL DEFAULT 'Asados Ventas',
        appLogo TEXT,
        primaryColor VARCHAR(7) NOT NULL DEFAULT '#dc2626',
        secondaryColor VARCHAR(7) NOT NULL DEFAULT '#f97316',
        theme VARCHAR(50) NOT NULL DEFAULT 'light',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        description TEXT,
        amount INTEGER NOT NULL,
        createdBy TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log('[MySQL] Database schema is ready.');
  }
}
