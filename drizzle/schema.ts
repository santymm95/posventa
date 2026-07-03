import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  password: varchar("password", { length: 255 }), // Hash de contraseña para login local
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Products table - Catálogo de productos disponibles
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: int("price").notNull(), // Precio en centavos para precisión
  image: text("image"), // URL o base64 de imagen
  category: varchar("category", { length: 100 }).notNull(), // asado, crudo, picada, etc
  parentProductId: int("parentProductId"),
  active: int("active").default(1).notNull(), // 1 = activo, 0 = inactivo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product Variants table - Variantes de productos (ej: Chorizos Crudos, Chorizos Asados)
 */
export const productVariants = mysqlTable("productVariants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(), // Referencia al producto principal
  name: varchar("name", { length: 255 }).notNull(), // Nombre de la variante (ej: "Crudos", "Asados")
  price: int("price"), // Precio de la variante (si es diferente al producto base, sino null)
  active: int("active").default(1).notNull(), // 1 = activo, 0 = inactivo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

/**
 * Inventory table - Gestión de inventario diario
 */
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  quantity: int("quantity").notNull(), // Cantidad disponible
  previousDayQuantity: int("previousDayQuantity").default(0).notNull(), // Acumulado del día anterior
  sold: int("sold").default(0).notNull(), // Cantidad vendida
  remaining: int("remaining").notNull(), // Cantidad restante
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

/**
 * Sales table - Registro de ventas
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(), // Precio unitario al momento de venta
  totalPrice: int("totalPrice").notNull(), // Precio total
  paymentMethod: mysqlEnum("paymentMethod", ["efectivo", "transferencia", "fiado"]).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * Daily balance table - Balances diarios
 */
export const dailyBalance = mysqlTable("dailyBalance", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  totalSales: int("totalSales").default(0).notNull(), // Total de ventas en pesos
  cashSales: int("cashSales").default(0).notNull(), // Ventas en efectivo
  transferSales: int("transferSales").default(0).notNull(), // Ventas por transferencia
  creditSales: int("creditSales").default(0).notNull(), // Ventas fiadas
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyBalance = typeof dailyBalance.$inferSelect;
export type InsertDailyBalance = typeof dailyBalance.$inferInsert;

/**
 * Cash Closings table - Cierre de caja diario
 */
export const cashClosings = mysqlTable("cashClosings", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(), // Fecha del cierre
  totalSales: int("totalSales").default(0).notNull(), // Total de ventas
  cashSales: int("cashSales").default(0).notNull(), // Ventas en efectivo
  transferSales: int("transferSales").default(0).notNull(), // Ventas por transferencia
  creditSales: int("creditSales").default(0).notNull(), // Ventas fiadas
  expectedCash: int("expectedCash").default(0).notNull(), // Efectivo esperado
  actualCash: int("actualCash").default(0).notNull(), // Efectivo contado
  difference: int("difference").default(0).notNull(), // Diferencia (actualCash - expectedCash)
  notes: text("notes"), // Notas del cierre
  closedBy: int("closedBy"), // Usuario que hizo el cierre (referencia a users.id)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashClosing = typeof cashClosings.$inferSelect;
export type InsertCashClosing = typeof cashClosings.$inferInsert;

/**
 * Settings table - Configuración de la aplicación
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Usuario propietario de la configuración
  appTitle: varchar("appTitle", { length: 255 }).default("Asados Ventas").notNull(),
  appLogo: text("appLogo"), // URL del logo
  primaryColor: varchar("primaryColor", { length: 7 }).default("#dc2626").notNull(), // Color principal (rojo por defecto)
  secondaryColor: varchar("secondaryColor", { length: 7 }).default("#f97316").notNull(), // Color secundario
  theme: mysqlEnum("theme", ["light", "dark"]).default("light").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;
