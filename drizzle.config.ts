import { defineConfig } from "drizzle-kit";

const connectionString = (process.env.DATABASE_URL || "mysql://root:@127.0.0.1:3306/asados_ventas").trim();
const isPostgres = connectionString.startsWith("postgres://") || connectionString.startsWith("postgresql://");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
