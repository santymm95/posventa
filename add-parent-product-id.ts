import { drizzle } from "drizzle-orm/mysql2/promise";
import mysql from "mysql2/promise";

async function addParentProductId() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    // Verificar si la columna ya existe
    const [columns]: any = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'parentProductId'"
    );
    
    if (columns.length === 0) {
      // Agregar la columna
      await connection.execute(
        "ALTER TABLE products ADD COLUMN parentProductId int AFTER category"
      );
      console.log("✓ Columna parentProductId agregada");
    } else {
      console.log("✓ Columna parentProductId ya existe");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

addParentProductId();
