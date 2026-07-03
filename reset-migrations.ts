import { drizzle } from "drizzle-orm/mysql2/promise";
import mysql from "mysql2/promise";

async function resetMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.execute("DROP TABLE IF EXISTS __drizzle_migrations");
    console.log("✓ Tabla __drizzle_migrations eliminada");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

resetMigrations();
