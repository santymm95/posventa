import 'dotenv/config';
import { sql } from './mysql';

export async function initializeDatabase(): Promise<void> {
  if (!sql) {
    console.warn('[MySQL] No database configuration found. Skipping schema initialization.');
    return;
  }

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
