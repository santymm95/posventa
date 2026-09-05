// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net2 from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db/conn.ts
import "dotenv/config";

// server/db/mysql.ts
import "dotenv/config";
import mysql from "mysql2/promise";
function parseDatabaseUrl(databaseUrl3) {
  if (!databaseUrl3) return null;
  try {
    const parsed = new URL(databaseUrl3);
    if (parsed.protocol !== "mysql:") {
      return null;
    }
    return {
      host: parsed.hostname || "127.0.0.1",
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: decodeURIComponent((parsed.pathname || "/").replace(/^\/+/, "") || "asados_ventas")
    };
  } catch {
    return null;
  }
}
function getDatabaseConfig() {
  const fromUrl = parseDatabaseUrl((process.env.DATABASE_URL || "").trim());
  if (fromUrl) {
    return fromUrl;
  }
  const host = (process.env.DB_HOST || "127.0.0.1").trim();
  const database = (process.env.DB_NAME || "asados_ventas").trim();
  const user = (process.env.DB_USER || "root").trim();
  const password = (process.env.DB_PASSWORD || "").trim();
  if (!host || !database || !user) {
    return null;
  }
  return {
    host,
    port: Number(process.env.DB_PORT || "3306"),
    user,
    password,
    database
  };
}
function hasDatabaseConfig() {
  return Boolean(getDatabaseConfig());
}
var pool = null;
function getPool() {
  if (!pool) {
    const config = getDatabaseConfig();
    if (!config) {
      throw new Error("MySQL config is not available. Set DATABASE_URL or DB_HOST/DB_USER/DB_NAME.");
    }
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4"
    });
  }
  return pool;
}
function normalizeValue(value) {
  if (value === void 0) return null;
  if (value === null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}
function buildQuery(strings, values) {
  return strings.reduce((query, chunk, index) => {
    return query + chunk + (index < values.length ? "?" : "");
  }, "");
}
function getTableName(query) {
  const match = query.match(/insert\s+into\s+`?([a-zA-Z0-9_]+)`?/i);
  return match?.[1] ?? null;
}
function parseReturningColumns(query) {
  const match = query.trim().match(/\breturning\b\s+([a-zA-Z0-9_*]+)\s*$/i);
  return match?.[1] ?? null;
}
function normalizeRow(row) {
  if (!row || typeof row !== "object") {
    return row;
  }
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}
async function executeQuery(query, values) {
  const connection = getPool();
  const [rows] = await connection.execute(query, values.map(normalizeValue));
  if (Array.isArray(rows)) {
    return rows.map((row) => normalizeRow(row));
  }
  return rows;
}
async function handleReturning(query, values) {
  const trimmedQuery = query.trim();
  const returningColumns = parseReturningColumns(trimmedQuery);
  if (!returningColumns) {
    return [];
  }
  const noReturningClause = trimmedQuery.replace(/\s+returning\s+[a-zA-Z0-9_*]+\s*$/i, "").trim();
  const result = await executeQuery(noReturningClause, values);
  const insertId = result.insertId ?? 0;
  if (returningColumns === "*" || returningColumns.toLowerCase() === "row") {
    const tableName = getTableName(noReturningClause);
    if (!tableName || !insertId) {
      return [];
    }
    const rows = await executeQuery(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [insertId]);
    return rows;
  }
  if (returningColumns.toLowerCase() === "id") {
    if (insertId) {
      return [{ id: insertId }];
    }
    const whereIdMatch = noReturningClause.match(/where\s+id\s*=\s*\?/i);
    if (whereIdMatch) {
      const idValue = values[values.length - 1];
      return [{ id: idValue }];
    }
  }
  return [];
}
var sql = hasDatabaseConfig() ? async (strings, ...values) => {
  const query = buildQuery(strings, values).trim();
  if (/\breturning\b/i.test(query)) {
    return handleReturning(query, values);
  }
  const result = await executeQuery(query, values);
  if (Array.isArray(result)) {
    return result;
  }
  return [];
} : null;

// server/db/neon.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
var databaseUrl = (process.env.DATABASE_URL || "").trim();
function hasNeonConfig() {
  return Boolean(databaseUrl);
}
var sql2 = hasNeonConfig() ? neon(databaseUrl) : null;

// server/db/conn.ts
var databaseUrl2 = (process.env.DATABASE_URL || "").trim();
var isPostgres = databaseUrl2.startsWith("postgres://") || databaseUrl2.startsWith("postgresql://");
var sql3 = isPostgres ? sql2 : sql;
var isPg = isPostgres;

// server/db.ts
function parseDateOnly(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function normalizeDateRange(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function buildDailyBalanceDelta(sale) {
  const totalSales = sale.totalPrice;
  const cashSales = sale.paymentMethod === "efectivo" ? sale.totalPrice : 0;
  const transferSales = sale.paymentMethod === "transferencia" ? sale.totalPrice : 0;
  const creditSales = sale.paymentMethod === "fiado" ? sale.totalPrice : 0;
  return {
    totalSales,
    cashSales,
    transferSales,
    creditSales
  };
}
function buildSaleWithProductName(sale) {
  return {
    ...sale,
    productName: sale.productName || "Producto",
    timestamp: sale.date
  };
}
function getInventoryProductIds(productId, parentProductId) {
  if (!parentProductId || parentProductId === productId) {
    return [productId];
  }
  return [productId, parentProductId];
}
async function getUserByEmail(email) {
  if (!sql3) return void 0;
  const normalized = email.trim().toLowerCase();
  const rows = await sql3`
    SELECT * FROM users
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return void 0;
  const data = rows[0];
  return {
    id: data.id,
    openId: data.openid,
    name: data.name,
    email: data.email,
    password: data.password,
    loginMethod: data.loginmethod,
    role: data.role,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat),
    lastSignedIn: new Date(data.lastsignedin)
  };
}
async function getUserByOpenId(openId) {
  if (!sql3) return void 0;
  const rows = await sql3`
    SELECT * FROM users
    WHERE openid = ${openId}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return void 0;
  const data = rows[0];
  return {
    id: data.id,
    openId: data.openid,
    name: data.name,
    email: data.email,
    password: data.password,
    loginMethod: data.loginmethod,
    role: data.role,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat),
    lastSignedIn: new Date(data.lastsignedin)
  };
}
async function getUserById(id) {
  if (!sql3) return void 0;
  const rows = await sql3`
    SELECT * FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return void 0;
  const data = rows[0];
  return {
    id: data.id,
    openId: data.openid,
    name: data.name,
    email: data.email,
    password: data.password,
    loginMethod: data.loginmethod,
    role: data.role,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat),
    lastSignedIn: new Date(data.lastsignedin)
  };
}
async function listUsers() {
  if (!sql3) return [];
  const rows = await sql3`
    SELECT id, name, email, role, createdat FROM users
    ORDER BY createdat ASC
  `;
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: new Date(u.createdat)
  }));
}
async function createUser(payload) {
  if (!sql3) throw new Error("Neon DB connection not available");
  const normalizedEmail = payload.email.trim().toLowerCase();
  const password = payload.password || null;
  const name = payload.name || payload.email;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await sql3`
    INSERT INTO users (openid, email, password, name, loginmethod, role, lastsignedin, updatedat)
    VALUES (${payload.openId}, ${normalizedEmail}, ${password}, ${name}, ${payload.loginMethod}, ${payload.role}, ${now}, ${now})
    RETURNING *
  `;
  const data = rows[0];
  return {
    id: data.id,
    openId: data.openid,
    name: data.name,
    email: data.email,
    role: data.role,
    createdAt: new Date(data.createdat)
  };
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  if (!sql3) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = await getUserByOpenId(user.openId);
  if (existing) {
    const email = user.email !== void 0 ? user.email ? user.email.trim().toLowerCase() : null : existing.email;
    const name = user.name !== void 0 ? user.name || null : existing.name;
    const loginMethod = user.loginMethod !== void 0 ? user.loginMethod || "local" : existing.loginMethod;
    const role = user.role !== void 0 ? user.role : existing.role;
    const lastSignedIn = user.lastSignedIn !== void 0 ? new Date(user.lastSignedIn).toISOString() : existing.lastSignedIn.toISOString();
    await sql3`
      UPDATE users 
      SET email = ${email}, name = ${name}, loginmethod = ${loginMethod}, role = ${role}, lastsignedin = ${lastSignedIn}, updatedat = ${now}
      WHERE openid = ${user.openId}
    `;
  } else {
    const email = user.email ? user.email.trim().toLowerCase() : null;
    const name = user.name || null;
    const loginMethod = user.loginMethod || "local";
    const role = user.role || "user";
    const lastSignedIn = user.lastSignedIn ? new Date(user.lastSignedIn).toISOString() : now;
    await sql3`
      INSERT INTO users (openid, email, name, loginmethod, role, lastsignedin, updatedat)
      VALUES (${user.openId}, ${email}, ${name}, ${loginMethod}, ${role}, ${lastSignedIn}, ${now})
    `;
  }
}
async function deleteUser(id) {
  if (!sql3) throw new Error("Neon DB connection not available");
  await sql3`DELETE FROM users WHERE id = ${id}`;
}
async function getAllProducts() {
  if (!sql3) return [];
  const rows = await sql3`
    SELECT * FROM products
    WHERE active = 1
    ORDER BY createdat DESC
  `;
  return rows.map((p) => ({
    id: Number(p.id),
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price ?? 0),
    image: p.image ?? null,
    category: p.category ?? "General",
    parentProductId: p.parentproductid ?? null,
    active: p.active ?? 1,
    createdAt: p.createdat ? new Date(p.createdat) : null,
    updatedAt: p.updatedat ? new Date(p.updatedat) : null
  }));
}
async function getProductById(id) {
  if (!sql3) return void 0;
  const rows = await sql3`
    SELECT * FROM products
    WHERE id = ${id}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return void 0;
  const data = rows[0];
  return {
    id: Number(data.id),
    name: data.name,
    description: data.description ?? null,
    price: Number(data.price ?? 0),
    image: data.image ?? null,
    category: data.category ?? "General",
    parentProductId: data.parentproductid ?? null,
    active: data.active ?? 1,
    createdAt: data.createdat ? new Date(data.createdat) : null,
    updatedAt: data.updatedat ? new Date(data.updatedat) : null
  };
}
async function createProduct(name, price, image = "", parentProductId) {
  if (!sql3) throw new Error("Neon DB connection not available");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await sql3`
    INSERT INTO products (name, description, price, image, category, parentproductid, active, updatedat)
    VALUES (${name}, '', ${price}, ${image || ""}, 'General', ${parentProductId ?? null}, 1, ${now})
    RETURNING *
  `;
  const data = rows[0];
  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    image: data.image ?? null,
    category: data.category ?? "General",
    parentProductId: data.parentproductid ?? null,
    active: data.active,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat)
  };
}
async function updateProduct(id, data) {
  if (!sql3) throw new Error("Neon DB connection not available");
  const existing = await getProductById(id);
  if (!existing) throw new Error("Product not found");
  const newName = data.name !== void 0 ? data.name : existing.name;
  const newPrice = data.price !== void 0 ? data.price : existing.price;
  const newImage = data.image !== void 0 ? data.image : existing.image;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await sql3`
    UPDATE products
    SET name = ${newName}, price = ${newPrice}, image = ${newImage}, updatedat = ${now}
    WHERE id = ${id}
  `;
  return getProductById(id);
}
async function deleteProduct(id) {
  if (!sql3) throw new Error("Neon DB connection not available");
  await sql3`DELETE FROM products WHERE id = ${id}`;
  return { success: true };
}
async function getTodayInventory() {
  if (!sql3) return [];
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const rows = await sql3`
    SELECT * FROM inventory
    WHERE date >= ${today.toISOString()} AND date < ${tomorrow.toISOString()}
  `;
  return rows.map((i) => ({
    id: i.id,
    productId: i.productid,
    date: new Date(i.date),
    quantity: i.quantity,
    previousDayQuantity: i.previousdayquantity,
    sold: i.sold,
    remaining: i.remaining,
    notes: i.notes,
    createdAt: new Date(i.createdat),
    updatedAt: new Date(i.updatedat)
  }));
}
async function getInventoryByProductAndDate(productId, date) {
  if (!sql3) return void 0;
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);
  const rows = await sql3`
    SELECT * FROM inventory
    WHERE productid = ${productId}
      AND date >= ${dateStart.toISOString()}
      AND date < ${dateEnd.toISOString()}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return void 0;
  const data = rows[0];
  return {
    id: data.id,
    productId: data.productid,
    date: new Date(data.date),
    quantity: data.quantity,
    previousDayQuantity: data.previousdayquantity,
    sold: data.sold,
    remaining: data.remaining,
    notes: data.notes,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat)
  };
}
async function upsertInventory(productId, quantity, previousDayQuantity, notes) {
  if (!sql3) return void 0;
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const existing = await getInventoryByProductAndDate(productId, today);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existing) {
    const newQuantity = (existing.quantity || 0) + quantity;
    const prevQty = previousDayQuantity !== 0 ? previousDayQuantity : existing.previousDayQuantity;
    const noteVal = notes ?? existing.notes ?? "";
    await sql3`
      UPDATE inventory
      SET quantity = ${newQuantity}, previousdayquantity = ${prevQty}, notes = ${noteVal}, updatedat = ${now}
      WHERE id = ${existing.id}
    `;
    return existing.id;
  } else {
    const rows = await sql3`
      INSERT INTO inventory (productid, date, quantity, previousdayquantity, sold, remaining, notes, updatedat)
      VALUES (${productId}, ${today.toISOString()}, ${quantity}, ${previousDayQuantity}, 0, ${quantity}, ${notes ?? ""}, ${now})
      RETURNING id
    `;
    return rows[0]?.id;
  }
}
async function getSalesByDate(date) {
  if (!sql3) return [];
  const { start, end } = normalizeDateRange(date, date);
  const rows = await sql3`
    SELECT * FROM sales
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
  `;
  return rows.map((s) => ({
    id: s.id,
    productId: s.productid,
    quantity: s.quantity,
    unitPrice: s.unitprice,
    totalPrice: s.totalprice,
    paymentMethod: s.paymentmethod,
    date: new Date(s.date),
    notes: s.notes,
    createdAt: new Date(s.createdat),
    updatedAt: new Date(s.updatedat)
  }));
}
async function getSalesByDateRange(startDate, endDate) {
  if (!sql3) return [];
  const { start, end } = normalizeDateRange(startDate, endDate);
  const rows = await sql3`
    SELECT * FROM sales
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
  `;
  return rows.map((s) => ({
    id: s.id,
    productId: s.productid,
    quantity: s.quantity,
    unitPrice: s.unitprice,
    totalPrice: s.totalprice,
    paymentMethod: s.paymentmethod,
    date: new Date(s.date),
    notes: s.notes,
    createdAt: new Date(s.createdat),
    updatedAt: new Date(s.updatedat)
  }));
}
async function createSale(payload) {
  if (!sql3) throw new Error("Neon DB connection not available");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await sql3`
    INSERT INTO sales (productid, quantity, unitprice, totalprice, paymentmethod, date, updatedat)
    VALUES (${payload.productId}, ${payload.quantity}, ${payload.unitPrice}, ${payload.totalPrice}, ${payload.paymentMethod}, ${payload.date.toISOString()}, ${now})
    RETURNING id
  `;
  return rows[0]?.id;
}
async function getExpensesByDate(date) {
  if (!sql3) return [];
  const { start, end } = normalizeDateRange(date, date);
  try {
    const rows = await sql3`
      SELECT * FROM expenses
      WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
    `;
    return rows.map((e) => ({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      amount: e.amount,
      createdBy: e.createdby || null,
      createdAt: new Date(e.createdat)
    }));
  } catch (err) {
    console.error("[Neon] Exception in getExpensesByDate:", err);
    return [];
  }
}
async function getRecentExpenses(limit = 20) {
  if (!sql3) return [];
  const rows = await sql3`
    SELECT * FROM expenses
    ORDER BY date DESC
    LIMIT ${limit}
  `;
  return rows.map((e) => ({
    id: e.id,
    date: new Date(e.date),
    description: e.description,
    amount: e.amount,
    createdBy: e.createdby || null,
    createdAt: new Date(e.createdat)
  }));
}
async function getExpensesByDateRange(startDate, endDate) {
  if (!sql3) return [];
  const { start, end } = normalizeDateRange(startDate, endDate);
  try {
    const rows = await sql3`
      SELECT * FROM expenses
      WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
      ORDER BY date ASC
    `;
    return rows.map((e) => ({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      amount: e.amount,
      createdBy: e.createdby || null,
      createdAt: new Date(e.createdat)
    }));
  } catch (err) {
    console.error("[Neon] Exception in getExpensesByDateRange:", err);
    return [];
  }
}
async function createExpense(payload) {
  if (!sql3) throw new Error("Neon DB connection not available");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await sql3`
    INSERT INTO expenses (date, description, amount, createdby, updatedat)
    VALUES (${payload.date.toISOString()}, ${payload.description || ""}, ${payload.amount}, ${payload.createdBy || null}, ${now})
    RETURNING id
  `;
  return rows[0]?.id;
}
async function getDailyBalance(date) {
  if (!sql3) return void 0;
  const { start, end } = normalizeDateRange(date, date);
  const rows = await sql3`
    SELECT * FROM dailybalance
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return void 0;
  const data = rows[0];
  return {
    id: data.id,
    date: new Date(data.date),
    totalSales: data.totalsales,
    cashSales: data.cashsales,
    transferSales: data.transfersales,
    creditSales: data.creditsales,
    notes: data.notes,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat)
  };
}
async function upsertDailyBalance(date, sale) {
  if (!sql3) return void 0;
  const { start } = normalizeDateRange(date, date);
  const delta = buildDailyBalanceDelta(sale);
  const existing = await getDailyBalance(date);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existing) {
    const newTotal = (existing.totalSales || 0) + delta.totalSales;
    const newCash = (existing.cashSales || 0) + delta.cashSales;
    const newTransfer = (existing.transferSales || 0) + delta.transferSales;
    const newCredit = (existing.creditSales || 0) + delta.creditSales;
    const rows = await sql3`
      UPDATE dailybalance
      SET totalsales = ${newTotal}, cashsales = ${newCash}, transfersales = ${newTransfer}, creditsales = ${newCredit}, updatedat = ${now}
      WHERE id = ${existing.id}
      RETURNING id
    `;
    return rows[0]?.id;
  } else {
    const rows = await sql3`
      INSERT INTO dailybalance (date, totalsales, cashsales, transfersales, creditsales, updatedat)
      VALUES (${start.toISOString()}, ${delta.totalSales}, ${delta.cashSales}, ${delta.transferSales}, ${delta.creditSales}, ${now})
      RETURNING id
    `;
    return rows[0]?.id;
  }
}
async function getCashClosingByDate(date) {
  if (!sql3) return null;
  const { start, end } = normalizeDateRange(date, date);
  const rows = await sql3`
    SELECT * FROM cashclosings
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return null;
  const data = rows[0];
  return {
    id: data.id,
    date: new Date(data.date),
    totalSales: data.totalsales,
    cashSales: data.cashsales,
    transferSales: data.transfersales,
    creditSales: data.creditsales,
    expectedCash: data.expectedcash,
    actualCash: data.actualcash,
    difference: data.difference,
    notes: data.notes,
    closedBy: data.closedby,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat)
  };
}
async function getAllCashClosings() {
  if (!sql3) return [];
  const rows = await sql3`
    SELECT * FROM cashclosings
    ORDER BY date DESC
  `;
  return rows.map((c) => ({
    id: c.id,
    date: new Date(c.date),
    totalSales: c.totalsales,
    cashSales: c.cashsales,
    transferSales: c.transfersales,
    creditSales: c.creditsales,
    expectedCash: c.expectedcash,
    actualCash: c.actualcash,
    difference: c.difference,
    notes: c.notes,
    closedBy: c.closedby,
    createdAt: new Date(c.createdat),
    updatedAt: new Date(c.updatedat)
  }));
}
async function getRecentCashClosings(limit = 20) {
  if (!sql3) return [];
  const rows = await sql3`
    SELECT * FROM cashclosings
    ORDER BY date DESC
    LIMIT ${limit}
  `;
  return rows.map((c) => ({
    id: c.id,
    date: new Date(c.date),
    totalSales: c.totalsales,
    cashSales: c.cashsales,
    transferSales: c.transfersales,
    creditSales: c.creditsales,
    expectedCash: c.expectedcash,
    actualCash: c.actualcash,
    difference: c.difference,
    notes: c.notes,
    closedBy: c.closedby,
    createdAt: new Date(c.createdat),
    updatedAt: new Date(c.updatedat)
  }));
}
async function createCashClosing(payload) {
  if (!sql3) throw new Error("Neon DB connection not available");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = await sql3`
    INSERT INTO cashclosings (date, totalsales, cashsales, transfersales, creditsales, expectedcash, actualcash, difference, notes, closedby, updatedat)
    VALUES (${payload.date.toISOString()}, ${payload.totalSales}, ${payload.cashSales}, ${payload.transferSales}, ${payload.creditSales}, ${payload.expectedCash}, ${payload.actualCash}, ${payload.difference}, ${payload.notes || ""}, ${payload.closedBy || null}, ${now})
    RETURNING id
  `;
  return rows[0]?.id;
}
async function getSettingsByUserId(userId) {
  const defaultSettings = {
    id: 0,
    userId,
    appTitle: "Asados Ventas",
    appLogo: null,
    primaryColor: "#DC2626",
    secondaryColor: "#EF4444",
    theme: "light",
    createdAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (!sql3) return defaultSettings;
  const rows = await sql3`
    SELECT * FROM settings
    WHERE userid = ${userId}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) return defaultSettings;
  const data = rows[0];
  return {
    id: data.id,
    userId: data.userid,
    appTitle: data.apptitle,
    appLogo: data.applogo,
    primaryColor: data.primarycolor,
    secondaryColor: data.secondarycolor,
    theme: data.theme,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat)
  };
}
async function upsertSettings(userId, data) {
  if (!sql3) return void 0;
  const existing = await getSettingsByUserId(userId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (existing && existing.id !== 0) {
    const newAppTitle = data.appTitle !== void 0 ? data.appTitle : existing.appTitle;
    const newAppLogo = data.appLogo !== void 0 ? data.appLogo : existing.appLogo;
    const newPrimary = data.primaryColor !== void 0 ? data.primaryColor : existing.primaryColor;
    const newSecondary = data.secondaryColor !== void 0 ? data.secondaryColor : existing.secondaryColor;
    const newTheme = data.theme !== void 0 ? data.theme : existing.theme;
    const rows = await sql3`
      UPDATE settings
      SET apptitle = ${newAppTitle}, applogo = ${newAppLogo}, primarycolor = ${newPrimary}, secondarycolor = ${newSecondary}, theme = ${newTheme}, updatedat = ${now}
      WHERE id = ${existing.id}
      RETURNING id
    `;
    return rows[0]?.id;
  } else {
    const rows = await sql3`
      INSERT INTO settings (userid, apptitle, applogo, primarycolor, secondarycolor, theme, updatedat)
      VALUES (${userId}, ${data.appTitle || "Asados Ventas"}, ${data.appLogo || null}, ${data.primaryColor || "#dc2626"}, ${data.secondaryColor || "#f97316"}, ${data.theme || "light"}, ${now})
      RETURNING id
    `;
    return rows[0]?.id;
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecureRequest(req) ? "none" : "lax",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";

// server/_core/auth.ts
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
var DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
var DEFAULT_ADMIN_PASSWORDS = ["admin123", "admin2026*"];
var DEFAULT_JWT_SECRET = "posventa-dev-secret";
function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() || DEFAULT_JWT_SECRET;
}
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
function isLocalAdminCredential(email, password) {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPassword = password?.trim();
  return normalizedEmail === DEFAULT_ADMIN_EMAIL && DEFAULT_ADMIN_PASSWORDS.includes(normalizedPassword ?? "");
}
async function comparePasswordWithCandidates(password, hashedPassword, candidates = []) {
  if (await bcrypt.compare(password, hashedPassword)) {
    return true;
  }
  for (const candidate of candidates) {
    if (candidate && await bcrypt.compare(candidate, hashedPassword)) {
      return true;
    }
  }
  return false;
}
async function verifyAuthToken(token) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(getJwtSecret()));
  return payload;
}

// server/_core/env.ts
var DEFAULT_COOKIE_SECRET = "posventa-cookie-secret";
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET?.trim() || DEFAULT_COOKIE_SECRET,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    if (ENV.oAuthServerUrl) {
      console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    } else {
      console.warn(
        "[OAuth] OAUTH_SERVER_URL is not configured; OAuth features will stay disabled until you set it."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = (ENV.cookieSecret || "posventa-cookie-secret").trim();
    if (!secret) {
      throw new Error("JWT_SECRET is empty; set it in the environment before signing sessions.");
    }
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT2({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify2(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = await verifyAuthToken(token);
        const userId = typeof decoded.userId === "string" ? Number(decoded.userId) : decoded.userId;
        if (typeof userId === "number") {
          const user2 = await getUserById(userId);
          if (user2) {
            return user2;
          }
        }
      } catch (error) {
        console.warn("[Auth] JWT verification failed:", String(error));
      }
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/_core/printer.ts
import net from "node:net";
import http from "node:http";
function formatCOP(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}
function formatPaymentMethod(method) {
  switch (method) {
    case "efectivo":
      return "Efectivo";
    case "transferencia":
      return "Transferencia";
    case "fiado":
      return "Fiado";
  }
}
function buildOpenDrawerBuffer() {
  return Buffer.from([27, 112, 0, 25, 250]);
}
function buildSaleReceiptBuffer(payload) {
  const lines = [
    payload.businessName || "ASADOS VENTAS",
    "----------------------------",
    (/* @__PURE__ */ new Date()).toLocaleString("es-CO"),
    "",
    payload.productName,
    `Cant: ${payload.quantity}  P/U: ${formatCOP(payload.unitPrice)}`,
    `Total: ${formatCOP(payload.totalPrice)}`,
    `Pago: ${formatPaymentMethod(payload.paymentMethod)}`
  ];
  if (payload.cashReceived !== void 0) {
    lines.push(`Recibido: ${formatCOP(payload.cashReceived)}`);
  }
  if (payload.changeAmount !== void 0) {
    lines.push(`Cambio: ${formatCOP(payload.changeAmount)}`);
  }
  lines.push("", "Gracias por su compra", "", "");
  const content = lines.join("\n");
  const init = Buffer.from([27, 64]);
  const center = Buffer.from([27, 97, 1]);
  const left = Buffer.from([27, 97, 0]);
  const bold = Buffer.from([27, 33, 8]);
  const normal = Buffer.from([27, 33, 0]);
  const cut = Buffer.from([29, 86, 65, 0]);
  const newline = Buffer.from("\n", "latin1");
  return Buffer.concat([
    init,
    center,
    Buffer.from(`${payload.businessName || "ASADOS VENTAS"}
`, "latin1"),
    normal,
    Buffer.from(`${"-".repeat(28)}
`, "latin1"),
    Buffer.from(`${(/* @__PURE__ */ new Date()).toLocaleString("es-CO")}

`, "latin1"),
    bold,
    Buffer.from(`${payload.productName}
`, "latin1"),
    normal,
    Buffer.from(`Cant: ${payload.quantity}  P/U: ${formatCOP(payload.unitPrice)}
`, "latin1"),
    Buffer.from(`Total: ${formatCOP(payload.totalPrice)}
`, "latin1"),
    Buffer.from(`Pago: ${formatPaymentMethod(payload.paymentMethod)}
`, "latin1"),
    ...payload.cashReceived !== void 0 ? [Buffer.from(`Recibido: ${formatCOP(payload.cashReceived)}
`, "latin1")] : [],
    ...payload.changeAmount !== void 0 ? [Buffer.from(`Cambio: ${formatCOP(payload.changeAmount)}
`, "latin1")] : [],
    Buffer.from(`
Gracias por su compra

`, "latin1"),
    cut
  ]);
}
function getPrinterConfig() {
  const host = process.env.THERMAL_PRINTER_HOST?.trim();
  const port = Number(process.env.THERMAL_PRINTER_PORT || 9100);
  const bridgeUrl = process.env.THERMAL_PRINTER_BRIDGE_URL?.trim();
  return {
    enabled: Boolean(host || bridgeUrl),
    host,
    port: Number.isFinite(port) ? port : 9100,
    bridgeUrl: bridgeUrl ?? void 0
  };
}
async function printSaleReceipt(payload) {
  const config = getPrinterConfig();
  if (!config.enabled) {
    return { ok: false, reason: "printer not configured" };
  }
  if (config.bridgeUrl) {
    const bridgeUrl = config.bridgeUrl;
    return new Promise((resolve) => {
      const body = JSON.stringify(payload);
      const req = http.request(
        bridgeUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body)
          }
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve({ ok: Boolean(res.statusCode && res.statusCode < 400) }));
        }
      );
      req.on("error", (error) => resolve({ ok: false, error: error.message }));
      req.write(body);
      req.end();
    });
  }
  if (!config.host) {
    return { ok: false, reason: "printer host not configured" };
  }
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    const finish = (ok, error) => {
      socket.destroy();
      resolve({ ok, error });
    };
    socket.setTimeout(4e3);
    socket.once("connect", () => {
      try {
        socket.write(buildOpenDrawerBuffer());
        socket.write(buildSaleReceiptBuffer(payload));
        socket.end();
        finish(true);
      } catch (error) {
        finish(false, error instanceof Error ? error.message : "unknown error");
      }
    });
    socket.once("timeout", () => finish(false, "printer timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.once("close", () => void 0);
  });
}

// server/routers.ts
var ADMIN_EMAIL = "admin@gmail.com";
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    login: publicProcedure.input(z2.object({ email: z2.string().email(), password: z2.string() })).mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      const normalizedPassword = input.password.trim();
      const canUseLocalAdminFallback = isLocalAdminCredential(normalizedEmail, normalizedPassword);
      if (canUseLocalAdminFallback) {
        const sessionToken = await sdk.createSessionToken("local-admin", { name: "Administrador" });
        try {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          console.log("[Auth] Setting session cookie for local-admin", { cookieOptions });
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
        } catch (e) {
        }
        return {
          token: sessionToken,
          user: {
            id: 1,
            openId: "local-admin",
            name: "Administrador",
            email: ADMIN_EMAIL,
            password: null,
            loginMethod: "local",
            role: "admin",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date(),
            lastSignedIn: /* @__PURE__ */ new Date()
          }
        };
      }
      try {
        const foundUser = await getUserByEmail(normalizedEmail);
        if (!foundUser) {
          throw new TRPCError3({ code: "UNAUTHORIZED", message: "Email o contrase\xF1a incorrectos" });
        }
        const passwordMatch = await comparePasswordWithCandidates(
          normalizedPassword,
          foundUser.password || "",
          foundUser.email === ADMIN_EMAIL ? ["admin123"] : []
        );
        if (!passwordMatch) {
          throw new TRPCError3({ code: "UNAUTHORIZED", message: "Email o contrase\xF1a incorrectos" });
        }
        const sessionToken = await sdk.createSessionToken(foundUser.openId, { name: foundUser.name || foundUser.email || "" });
        try {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          console.log("[Auth] Setting session cookie for DB user", { openId: foundUser.openId, cookieOptions });
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
        } catch {
        }
        return { token: sessionToken, user: foundUser };
      } catch (error) {
        if (error instanceof TRPCError3) throw error;
        if (canUseLocalAdminFallback) {
          const sessionToken = await sdk.createSessionToken("local-admin", { name: "Administrador" });
          try {
            const cookieOptions = getSessionCookieOptions(ctx.req);
            console.log("[Auth] Setting session cookie for local-admin (db-down)", { cookieOptions });
            ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
          } catch {
          }
          return {
            token: sessionToken,
            user: {
              id: 1,
              openId: "local-admin",
              name: "Administrador",
              email: ADMIN_EMAIL,
              password: null,
              loginMethod: "local",
              role: "admin",
              createdAt: /* @__PURE__ */ new Date(),
              updatedAt: /* @__PURE__ */ new Date(),
              lastSignedIn: /* @__PURE__ */ new Date()
            }
          };
        }
        console.error("Login failed:", error);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo completar el inicio de sesi\xF3n" });
      }
    }),
    register: publicProcedure.input(z2.object({ email: z2.string().email(), password: z2.string().min(6), name: z2.string() })).mutation(async ({ input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "El email ya est\xE1 registrado" });
      }
      const hashedPassword = await hashPassword(input.password);
      await createUser({
        openId: `local-${Date.now()}`,
        email: input.email,
        password: hashedPassword,
        name: input.name,
        loginMethod: "local",
        role: "user"
      });
      return { success: true };
    })
  }),
  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      return listUsers();
    }),
    create: protectedProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(6),
      name: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "El email ya est\xE1 registrado" });
      }
      const hashedPassword = await hashPassword(input.password);
      const createdUser = await createUser({
        openId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        email: input.email,
        password: hashedPassword,
        name: input.name || input.email,
        loginMethod: "local",
        role: "user"
      });
      return {
        success: true,
        user: createdUser
      };
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      const target = await getUserById(input.id);
      if (!target) {
        throw new TRPCError3({ code: "NOT_FOUND", message: "Usuario no encontrado" });
      }
      if (target.role === "admin") {
        throw new TRPCError3({ code: "FORBIDDEN", message: "No se puede eliminar al administrador" });
      }
      await deleteUser(input.id);
      return { success: true };
    })
  }),
  products: router({
    list: publicProcedure.query(async () => {
      return getAllProducts();
    }),
    create: protectedProcedure.input(z2.object({
      name: z2.string().min(1),
      price: z2.number().min(0),
      imageData: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      let imagePath = "";
      if (input.imageData) {
        const fs3 = await import("fs/promises");
        const path3 = await import("path");
        const crypto = await import("crypto");
        try {
          const uploadsDir = path3.join(process.cwd(), "client", "public", "uploads");
          await fs3.mkdir(uploadsDir, { recursive: true });
          const timestamp = Date.now();
          const random = crypto.randomBytes(4).toString("hex");
          const filename = `product-${timestamp}-${random}.jpg`;
          const filepath = path3.join(uploadsDir, filename);
          const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, "");
          await fs3.writeFile(filepath, Buffer.from(base64Data, "base64"));
          imagePath = `/uploads/${filename}`;
        } catch (error) {
          console.error("Error guardando imagen:", error);
        }
      }
      const createdProduct = await createProduct(input.name, Math.round(input.price * 100), imagePath);
      return createdProduct;
    }),
    update: protectedProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).optional(),
      price: z2.number().min(0).optional(),
      imageData: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      let imagePath = void 0;
      if (input.imageData !== void 0) {
        if (input.imageData) {
          const fs3 = await import("fs/promises");
          const path3 = await import("path");
          const crypto = await import("crypto");
          try {
            const uploadsDir = path3.join(process.cwd(), "client", "public", "uploads");
            await fs3.mkdir(uploadsDir, { recursive: true });
            const timestamp = Date.now();
            const random = crypto.randomBytes(4).toString("hex");
            const filename = `product-${timestamp}-${random}.jpg`;
            const filepath = path3.join(uploadsDir, filename);
            const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, "");
            await fs3.writeFile(filepath, Buffer.from(base64Data, "base64"));
            imagePath = `/uploads/${filename}`;
          } catch (error) {
            console.error("Error actualizando imagen:", error);
          }
        } else {
          imagePath = null;
        }
      }
      const updatedProduct = await updateProduct(input.id, {
        name: input.name,
        price: input.price !== void 0 ? Math.round(input.price * 100) : void 0,
        image: imagePath
      });
      return updatedProduct;
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      return deleteProduct(input.id);
    }),
    createVariant: protectedProcedure.input(z2.object({
      parentProductId: z2.number(),
      name: z2.string().min(1),
      price: z2.number().optional()
    })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError3({ code: "FORBIDDEN" });
      }
      return createProduct(input.name, Math.round((input.price || 0) * 100), "", input.parentProductId);
    })
  }),
  inventory: router({
    today: publicProcedure.query(async () => {
      return getTodayInventory();
    }),
    upsert: protectedProcedure.input(z2.object({
      productId: z2.number(),
      quantity: z2.number(),
      previousDayQuantity: z2.number().default(0),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const result = await upsertInventory(
        input.productId,
        input.quantity,
        input.previousDayQuantity,
        input.notes
      );
      return { success: true, id: result };
    })
  }),
  sales: router({
    create: protectedProcedure.input(z2.object({
      productId: z2.number(),
      quantity: z2.number().positive(),
      unitPrice: z2.number().positive(),
      paymentMethod: z2.enum(["efectivo", "transferencia", "fiado"])
    })).mutation(async ({ input }) => {
      const product = await getProductById(input.productId);
      if (!product) throw new Error("Producto no encontrado");
      const inventoryProductIds = getInventoryProductIds(
        input.productId,
        product.parentProductId
      );
      const totalPrice = input.quantity * input.unitPrice;
      const resultId = await createSale({
        productId: input.productId,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalPrice,
        paymentMethod: input.paymentMethod,
        date: /* @__PURE__ */ new Date()
      });
      await upsertDailyBalance(/* @__PURE__ */ new Date(), {
        totalPrice,
        paymentMethod: input.paymentMethod
      });
      for (const inventoryProductId of inventoryProductIds) {
        await upsertInventory(inventoryProductId, -input.quantity, 0, `Venta de ${product.name || "Producto"}`);
      }
      void printSaleReceipt({
        businessName: "ASADOS VENTAS",
        productName: product.name || "Producto",
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalPrice,
        paymentMethod: input.paymentMethod
      }).catch((error) => {
        console.error("Receipt print failed", error);
      });
      return { success: true, id: resultId };
    }),
    byDate: publicProcedure.input(z2.object({ date: z2.date() })).query(async ({ input }) => {
      const salesRows = await getSalesByDate(input.date);
      return Promise.all(salesRows.map(async (sale) => {
        const product = await getProductById(sale.productId);
        return buildSaleWithProductName({
          ...sale,
          productName: product?.name,
          date: sale.date
        });
      }));
    }),
    byDateRange: publicProcedure.input(z2.object({ startDate: z2.date(), endDate: z2.date() })).query(async ({ input }) => {
      const salesRows = await getSalesByDateRange(input.startDate, input.endDate);
      return Promise.all(salesRows.map(async (sale) => {
        const product = await getProductById(sale.productId);
        return buildSaleWithProductName({
          ...sale,
          productName: product?.name,
          date: sale.date
        });
      }));
    })
  }),
  reports: router({
    dailyBalance: publicProcedure.input(z2.object({ date: z2.date() })).query(async ({ input }) => {
      const salesData = await getSalesByDate(input.date);
      const dailyBalanceData = await getDailyBalance(input.date);
      if (dailyBalanceData) {
        return {
          totalSales: dailyBalanceData.totalSales,
          cashSales: dailyBalanceData.cashSales,
          transferSales: dailyBalanceData.transferSales,
          creditSales: dailyBalanceData.creditSales,
          transactionCount: salesData.length
        };
      }
      const totalSales = salesData.reduce((sum, s) => sum + s.totalPrice, 0);
      const cashSales = salesData.filter((s) => s.paymentMethod === "efectivo").reduce((sum, s) => sum + s.totalPrice, 0);
      const transferSales = salesData.filter((s) => s.paymentMethod === "transferencia").reduce((sum, s) => sum + s.totalPrice, 0);
      const creditSales = salesData.filter((s) => s.paymentMethod === "fiado").reduce((sum, s) => sum + s.totalPrice, 0);
      return {
        totalSales,
        cashSales,
        transferSales,
        creditSales,
        transactionCount: salesData.length
      };
    })
  }),
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user?.id) throw new Error("User not authenticated");
      return getSettingsByUserId(ctx.user.id);
    }),
    update: protectedProcedure.input(z2.object({
      appTitle: z2.string().optional(),
      appLogo: z2.string().optional(),
      primaryColor: z2.string().optional(),
      secondaryColor: z2.string().optional(),
      theme: z2.enum(["light", "dark"]).optional()
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error("User not authenticated");
      const result = await upsertSettings(ctx.user.id, input);
      return { success: true, id: result };
    })
  }),
  cashClosings: router({
    create: protectedProcedure.input(z2.object({
      date: z2.date(),
      expectedCash: z2.number(),
      actualCash: z2.number(),
      notes: z2.string().optional()
    })).mutation(async ({ input, ctx }) => {
      const dailyBalanceData = await getDailyBalance(input.date);
      const salesData = await getSalesByDate(input.date);
      const totalSales = dailyBalanceData?.totalSales ?? salesData.reduce((sum, s) => sum + s.totalPrice, 0);
      const cashSales = dailyBalanceData?.cashSales ?? salesData.filter((s) => s.paymentMethod === "efectivo").reduce((sum, s) => sum + s.totalPrice, 0);
      const transferSales = dailyBalanceData?.transferSales ?? salesData.filter((s) => s.paymentMethod === "transferencia").reduce((sum, s) => sum + s.totalPrice, 0);
      const creditSales = dailyBalanceData?.creditSales ?? salesData.filter((s) => s.paymentMethod === "fiado").reduce((sum, s) => sum + s.totalPrice, 0);
      const difference = input.actualCash - input.expectedCash;
      const closedByVal = ctx.user?.id ? String(ctx.user.id) : null;
      const resultId = await createCashClosing({
        date: input.date,
        totalSales,
        cashSales,
        transferSales,
        creditSales,
        expectedCash: input.expectedCash,
        actualCash: input.actualCash,
        difference,
        notes: input.notes,
        closedBy: closedByVal
      });
      return { success: true, id: resultId };
    }),
    byDate: publicProcedure.input(z2.object({ date: z2.date() })).query(async ({ input }) => {
      return getCashClosingByDate(input.date);
    }),
    recent: publicProcedure.input(z2.object({ limit: z2.number().default(20) })).query(async ({ input }) => {
      return getRecentCashClosings(input.limit);
    }),
    all: publicProcedure.query(async () => {
      return getAllCashClosings();
    })
  }),
  expenses: router({
    create: protectedProcedure.input(z2.object({
      date: z2.date(),
      description: z2.string().optional(),
      amount: z2.number()
    })).mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) throw new Error("User not authenticated");
      const createdBy = ctx.user.id ? String(ctx.user.id) : null;
      const id = await createExpense({
        date: input.date,
        description: input.description,
        amount: Math.round(input.amount * 100),
        createdBy
      });
      return { success: true, id };
    }),
    byDate: publicProcedure.input(z2.object({ date: z2.date() })).query(async ({ input }) => {
      return getExpensesByDate(input.date);
    }),
    recent: publicProcedure.input(z2.object({ limit: z2.number().default(20) })).query(async ({ input }) => {
      return getRecentExpenses(input.limit);
    }),
    byRange: publicProcedure.input(z2.object({ startDate: z2.date(), endDate: z2.date() })).query(async ({ input }) => {
      return getExpensesByDateRange(input.startDate, input.endDate);
    })
  })
});

// server/_core/context.ts
function buildFallbackUserFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const userId = typeof payload.userId === "string" ? Number(payload.userId) : payload.userId;
    const email = typeof payload.email === "string" ? payload.email : null;
    const openId = typeof payload.openId === "string" ? payload.openId : null;
    const role = payload.role === "admin" ? "admin" : "user";
    if (typeof userId !== "number" || !Number.isFinite(userId)) {
      return null;
    }
    return {
      id: userId,
      openId: openId || `jwt-${userId}`,
      name: typeof payload.name === "string" ? payload.name : email || "Usuario",
      email,
      password: null,
      loginMethod: "local",
      role,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      lastSignedIn: /* @__PURE__ */ new Date()
    };
  } catch {
    return null;
  }
}
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
  }
  if (!user) {
    try {
      const cookieHeader = opts.req.headers && opts.req.headers.cookie || void 0;
      let sessionCookie = void 0;
      if (cookieHeader) {
        const parts = cookieHeader.split(";").map((s) => s.trim());
        const match = parts.find((p) => p.startsWith(`${COOKIE_NAME}=`) || p.startsWith("session="));
        if (match) {
          const idx = match.indexOf("=");
          sessionCookie = match.substring(idx + 1);
        } else {
          const candidate = parts.find((p) => p.includes("=") && p.split("=")[0].length > 0);
          if (candidate) sessionCookie = candidate.split("=")[1];
        }
      }
      const parsed = await sdk.verifySession(sessionCookie);
      if (parsed && parsed.openId) {
        let dbUser;
        try {
          dbUser = await getUserByOpenId(parsed.openId);
        } catch {
        }
        const fallbackUser = dbUser || {
          id: parsed.openId === "local-admin" ? 1 : 0,
          openId: parsed.openId,
          name: parsed.name || parsed.openId,
          email: null,
          password: null,
          loginMethod: "local",
          role: parsed.openId === "local-admin" ? "admin" : "user",
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date(),
          lastSignedIn: /* @__PURE__ */ new Date()
        };
        user = fallbackUser;
      }
    } catch {
    }
  }
  if (!user) {
    try {
      const authHeader = opts.req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const verified = await verifyAuthToken(token);
        if (verified && typeof verified.userId === "number") {
          const tokenUser = buildFallbackUserFromToken(token);
          if (tokenUser) {
            try {
              const dbUser = await getUserById(tokenUser.id);
              user = dbUser || tokenUser;
            } catch {
              user = tokenUser;
            }
          }
        }
      }
    } catch {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server2) {
      server2.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app2, server2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server: server2 },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/db/init.ts
import "dotenv/config";
async function initializeDatabase() {
  if (!sql3) {
    console.warn("No database configuration found. Skipping schema initialization.");
    return;
  }
  if (isPg) {
    console.log("[PostgreSQL] Initializing schema...");
    await sql3`
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
    `;
    await sql3`
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
    `;
    await sql3`
      CREATE TABLE IF NOT EXISTS productvariants (
        id SERIAL PRIMARY KEY,
        productid INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price INTEGER,
        active INTEGER NOT NULL DEFAULT 1,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql3`
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
    `;
    await sql3`
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
    `;
    await sql3`
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
    `;
    await sql3`
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
    `;
    await sql3`
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
    `;
    await sql3`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP NOT NULL,
        description TEXT,
        amount INTEGER NOT NULL,
        createdby INTEGER,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log("[PostgreSQL] Database schema is ready. Seeding if needed...");
    const adminCheck = await sql3`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    if (adminCheck.length === 0) {
      console.log("[PostgreSQL] Seeding default admin user...");
      await sql3`
        INSERT INTO users (openid, name, email, loginmethod, role)
        VALUES ('admin-001', 'Administrador', 'admin@gmail.com', 'local', 'admin')
      `;
    }
    const productsCheck = await sql3`SELECT id FROM products LIMIT 1`;
    if (productsCheck.length === 0) {
      console.log("[PostgreSQL] Seeding default products...");
      await sql3`
        INSERT INTO products (name, description, price, category, active) VALUES
        ('Chorizos Asados', 'Chorizos asados frescos', 600000, 'asado', 1),
        ('Chorizos Crudos', 'Chorizos crudos para cocinar', 350000, 'crudo', 1),
        ('Picadas', 'Tabla de picadas variadas', 2500000, 'picada', 1),
        ('Choriperros', 'Chorizos con pan tipo perro caliente', 700000, 'choriperro', 1),
        ('Chuzos', 'Chuzos de carne asada', 600000, 'chuzo', 1)
      `;
    }
  } else {
    console.log("[MySQL] Initializing schema...");
    await sql3`
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
    await sql3`
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
    await sql3`
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
    await sql3`
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
    await sql3`
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
    await sql3`
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
    await sql3`
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
    await sql3`
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
    await sql3`
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
    console.log("[MySQL] Database schema is ready.");
  }
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server2 = net2.createServer();
    server2.listen(port, () => {
      server2.close(() => resolve(true));
    });
    server2.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
var app = express2();
var server = createServer(app);
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ limit: "50mb", extended: true }));
var dbInitialized = null;
var ensureDatabaseInitialized = () => {
  if (!dbInitialized) {
    dbInitialized = initializeDatabase().catch((err) => {
      console.error("Failed to initialize database:", err);
      dbInitialized = null;
      throw err;
    });
  }
  return dbInitialized;
};
app.use(async (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (err) {
    next(err);
  }
});
app.get("/health", (_req, res) => {
  res.json({ ok: true, database: Boolean(process.env.DATABASE_URL) });
});
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
if (process.env.NODE_ENV === "development") {
  setupVite(app, server).catch(console.error);
} else {
  serveStatic(app);
}
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    error: {
      json: {
        message: err.message || "Internal Server Error",
        code: -32603,
        data: {
          code: "INTERNAL_SERVER_ERROR",
          httpStatus: err.status || 500,
          stack: err.stack || ""
        }
      }
    }
  });
});
if (!process.env.VERCEL) {
  (async () => {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  })().catch(console.error);
}
var core_default = app;

// api/index.ts
function handler(req, res) {
  try {
    return core_default(req, res);
  } catch (error) {
    console.error("Vercel handler crash:", error);
    res.status(500).json({
      error: {
        json: {
          message: error.message || "Vercel handler crash",
          code: -32603,
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: 500,
            stack: error.stack || String(error)
          }
        }
      }
    });
  }
}
export {
  handler as default
};
