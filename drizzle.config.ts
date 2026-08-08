import { defineConfig } from "drizzle-kit";

const connectionString = (process.env.DATABASE_URL || "mysql://root:@127.0.0.1:3306/asados_ventas").trim();

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
