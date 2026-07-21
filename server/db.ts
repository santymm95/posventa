import { sql } from './db/neon';
import { InsertUser } from "../drizzle/schema";

// Helper functions for dates and calculations
function parseDateOnly(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function normalizeDateRange(startDate: Date, endDate: Date) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function buildDailyBalanceDelta(sale: { totalPrice: number; paymentMethod: "efectivo" | "transferencia" | "fiado" }) {
  const totalSales = sale.totalPrice;
  const cashSales = sale.paymentMethod === "efectivo" ? sale.totalPrice : 0;
  const transferSales = sale.paymentMethod === "transferencia" ? sale.totalPrice : 0;
  const creditSales = sale.paymentMethod === "fiado" ? sale.totalPrice : 0;

  return {
    totalSales,
    cashSales,
    transferSales,
    creditSales,
  };
}

export function buildSaleWithProductName(sale: any) {
  return {
    ...sale,
    productName: sale.productName || "Producto",
    timestamp: sale.date,
  };
}

export function getInventoryProductIds(productId: number, parentProductId?: number | null) {
  if (!parentProductId || parentProductId === productId) {
    return [productId];
  }
  return [productId, parentProductId];
}

export async function getDb() {
  return sql;
}

// ==========================================
// USER METHODS
// ==========================================

export async function getUserByEmail(email: string) {
  if (!sql) return undefined;
  const normalized = email.trim().toLowerCase();
  const rows = await sql`
    SELECT * FROM users
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return undefined;
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
    lastSignedIn: new Date(data.lastsignedin),
  };
}

export async function getUserByOpenId(openId: string) {
  if (!sql) return undefined;
  const rows = await sql`
    SELECT * FROM users
    WHERE openid = ${openId}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return undefined;
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
    lastSignedIn: new Date(data.lastsignedin),
  };
}

export async function getUserById(id: number) {
  if (!sql) return undefined;
  const rows = await sql`
    SELECT * FROM users
    WHERE id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return undefined;
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
    lastSignedIn: new Date(data.lastsignedin),
  };
}

export async function listUsers() {
  if (!sql) return [];
  const rows = await sql`
    SELECT id, name, email, role, createdat FROM users
    ORDER BY createdat ASC
  `;

  return rows.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: new Date(u.createdat),
  }));
}

export async function createUser(payload: {
  openId: string;
  email: string;
  password?: string | null;
  name?: string | null;
  loginMethod: string;
  role: string;
}) {
  if (!sql) throw new Error("Neon DB connection not available");

  const normalizedEmail = payload.email.trim().toLowerCase();
  const password = payload.password || null;
  const name = payload.name || payload.email;
  const now = new Date().toISOString();

  const rows = await sql`
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
    createdAt: new Date(data.createdat),
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  if (!sql) return;

  const now = new Date().toISOString();
  const email = user.email ? user.email.trim().toLowerCase() : null;

  await sql`
    INSERT INTO users (openid, email, name, loginmethod, role, lastsignedin, updatedat)
    VALUES (${user.openId}, ${email}, ${user.name || null}, ${user.loginMethod || 'local'}, ${user.role || 'user'}, ${now}, ${now})
    ON CONFLICT (openid) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      loginmethod = EXCLUDED.loginmethod,
      role = EXCLUDED.role,
      lastsignedin = EXCLUDED.lastsignedin,
      updatedat = EXCLUDED.updatedat
  `;
}

export async function deleteUser(id: number) {
  if (!sql) throw new Error("Neon DB connection not available");
  await sql`DELETE FROM users WHERE id = ${id}`;
}

// ==========================================
// PRODUCT METHODS
// ==========================================

export async function getAllProducts() {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM products
    WHERE active = 1
    ORDER BY createdat DESC
  `;

  return rows.map((p: any) => ({
    id: Number(p.id),
    name: p.name,
    description: p.description ?? null,
    price: Number(p.price ?? 0),
    image: p.image ?? null,
    category: p.category ?? 'General',
    parentProductId: p.parentproductid ?? null,
    active: p.active ?? 1,
    createdAt: p.createdat ? new Date(p.createdat) : null,
    updatedAt: p.updatedat ? new Date(p.updatedat) : null,
  }));
}

export async function getProductById(id: number) {
  if (!sql) return undefined;
  const rows = await sql`
    SELECT * FROM products
    WHERE id = ${id}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return undefined;
  const data = rows[0];

  return {
    id: Number(data.id),
    name: data.name,
    description: data.description ?? null,
    price: Number(data.price ?? 0),
    image: data.image ?? null,
    category: data.category ?? 'General',
    parentProductId: data.parentproductid ?? null,
    active: data.active ?? 1,
    createdAt: data.createdat ? new Date(data.createdat) : null,
    updatedAt: data.updatedat ? new Date(data.updatedat) : null,
  };
}

export async function createProduct(name: string, price: number, image: string = "", parentProductId?: number) {
  if (!sql) throw new Error("Neon DB connection not available");

  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO products (name, description, price, image, category, parentproductid, active, updatedat)
    VALUES (${name}, '', ${price}, ${image || ''}, 'General', ${parentProductId ?? null}, 1, ${now})
    RETURNING *
  `;

  const data = rows[0];

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? null,
    price: data.price,
    image: data.image ?? null,
    category: data.category ?? 'General',
    parentProductId: data.parentproductid ?? null,
    active: data.active,
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat),
  };
}

export async function updateProduct(id: number, data: { name?: string; price?: number; image?: string | null }) {
  if (!sql) throw new Error("Neon DB connection not available");

  const existing = await getProductById(id);
  if (!existing) throw new Error("Product not found");

  const newName = data.name !== undefined ? data.name : existing.name;
  const newPrice = data.price !== undefined ? data.price : existing.price;
  const newImage = data.image !== undefined ? data.image : existing.image;
  const now = new Date().toISOString();

  await sql`
    UPDATE products
    SET name = ${newName}, price = ${newPrice}, image = ${newImage}, updatedat = ${now}
    WHERE id = ${id}
  `;

  return getProductById(id);
}

export async function deleteProduct(id: number) {
  if (!sql) throw new Error("Neon DB connection not available");
  await sql`DELETE FROM products WHERE id = ${id}`;
  return { success: true };
}

// ==========================================
// INVENTORY METHODS
// ==========================================

export async function getTodayInventory() {
  if (!sql) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const rows = await sql`
    SELECT * FROM inventory
    WHERE date >= ${today.toISOString()} AND date < ${tomorrow.toISOString()}
  `;

  return rows.map((i: any) => ({
    id: i.id,
    productId: i.productid,
    date: new Date(i.date),
    quantity: i.quantity,
    previousDayQuantity: i.previousdayquantity,
    sold: i.sold,
    remaining: i.remaining,
    notes: i.notes,
    createdAt: new Date(i.createdat),
    updatedAt: new Date(i.updatedat),
  }));
}

export async function getInventoryByProductAndDate(productId: number, date: Date) {
  if (!sql) return undefined;
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  const rows = await sql`
    SELECT * FROM inventory
    WHERE productid = ${productId}
      AND date >= ${dateStart.toISOString()}
      AND date < ${dateEnd.toISOString()}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return undefined;
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
    updatedAt: new Date(data.updatedat),
  };
}

export async function upsertInventory(productId: number, quantity: number, previousDayQuantity: number, notes?: string) {
  if (!sql) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await getInventoryByProductAndDate(productId, today);
  const now = new Date().toISOString();

  if (existing) {
    const newQuantity = (existing.quantity || 0) + quantity;
    const prevQty = previousDayQuantity !== 0 ? previousDayQuantity : existing.previousDayQuantity;
    const noteVal = notes ?? existing.notes ?? "";

    await sql`
      UPDATE inventory
      SET quantity = ${newQuantity}, previousdayquantity = ${prevQty}, notes = ${noteVal}, updatedat = ${now}
      WHERE id = ${existing.id}
    `;
    return existing.id;
  } else {
    const rows = await sql`
      INSERT INTO inventory (productid, date, quantity, previousdayquantity, sold, remaining, notes, updatedat)
      VALUES (${productId}, ${today.toISOString()}, ${quantity}, ${previousDayQuantity}, 0, ${quantity}, ${notes ?? ""}, ${now})
      RETURNING id
    `;
    return rows[0]?.id;
  }
}

// ==========================================
// SALES METHODS
// ==========================================

export async function getSalesByDate(date: Date) {
  if (!sql) return [];
  const { start, end } = normalizeDateRange(date, date);

  const rows = await sql`
    SELECT * FROM sales
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
  `;

  return rows.map((s: any) => ({
    id: s.id,
    productId: s.productid,
    quantity: s.quantity,
    unitPrice: s.unitprice,
    totalPrice: s.totalprice,
    paymentMethod: s.paymentmethod,
    date: new Date(s.date),
    notes: s.notes,
    createdAt: new Date(s.createdat),
    updatedAt: new Date(s.updatedat),
  }));
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  if (!sql) return [];
  const { start, end } = normalizeDateRange(startDate, endDate);

  const rows = await sql`
    SELECT * FROM sales
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
  `;

  return rows.map((s: any) => ({
    id: s.id,
    productId: s.productid,
    quantity: s.quantity,
    unitPrice: s.unitprice,
    totalPrice: s.totalprice,
    paymentMethod: s.paymentmethod,
    date: new Date(s.date),
    notes: s.notes,
    createdAt: new Date(s.createdat),
    updatedAt: new Date(s.updatedat),
  }));
}

export async function createSale(payload: {
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: "efectivo" | "transferencia" | "fiado";
  date: Date;
}) {
  if (!sql) throw new Error("Neon DB connection not available");

  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO sales (productid, quantity, unitprice, totalprice, paymentmethod, date, updatedat)
    VALUES (${payload.productId}, ${payload.quantity}, ${payload.unitPrice}, ${payload.totalPrice}, ${payload.paymentMethod}, ${payload.date.toISOString()}, ${now})
    RETURNING id
  `;

  return rows[0]?.id;
}

// ==========================================
// EXPENSES METHODS
// ==========================================

export async function getExpensesByDate(date: Date) {
  if (!sql) return [];
  const { start, end } = normalizeDateRange(date, date);
  try {
    const rows = await sql`
      SELECT * FROM expenses
      WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
    `;

    return rows.map((e: any) => ({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      amount: e.amount,
      createdBy: e.createdby || null,
      createdAt: new Date(e.createdat),
    }));
  } catch (err) {
    console.error('[Neon] Exception in getExpensesByDate:', err);
    return [];
  }
}

export async function getRecentExpenses(limit: number = 20) {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM expenses
    ORDER BY date DESC
    LIMIT ${limit}
  `;

  return rows.map((e: any) => ({
    id: e.id,
    date: new Date(e.date),
    description: e.description,
    amount: e.amount,
    createdBy: e.createdby || null,
    createdAt: new Date(e.createdat),
  }));
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  if (!sql) return [];
  const { start, end } = normalizeDateRange(startDate, endDate);
  try {
    const rows = await sql`
      SELECT * FROM expenses
      WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
      ORDER BY date ASC
    `;

    return rows.map((e: any) => ({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      amount: e.amount,
      createdBy: e.createdby || null,
      createdAt: new Date(e.createdat),
    }));
  } catch (err) {
    console.error('[Neon] Exception in getExpensesByDateRange:', err);
    return [];
  }
}

export async function createExpense(payload: { date: Date; description?: string; amount: number; createdBy?: string | null; }) {
  if (!sql) throw new Error("Neon DB connection not available");

  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO expenses (date, description, amount, createdby, updatedat)
    VALUES (${payload.date.toISOString()}, ${payload.description || ""}, ${payload.amount}, ${payload.createdBy || null}, ${now})
    RETURNING id
  `;

  return rows[0]?.id;
}

// ==========================================
// DAILY BALANCE METHODS
// ==========================================

export async function getDailyBalance(date: Date) {
  if (!sql) return undefined;
  const { start, end } = normalizeDateRange(date, date);

  const rows = await sql`
    SELECT * FROM dailybalance
    WHERE date >= ${start.toISOString()} AND date <= ${end.toISOString()}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return undefined;
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
    updatedAt: new Date(data.updatedat),
  };
}

export async function upsertDailyBalance(date: Date, sale: { totalPrice: number; paymentMethod: "efectivo" | "transferencia" | "fiado" }) {
  if (!sql) return undefined;
  const { start } = normalizeDateRange(date, date);
  const delta = buildDailyBalanceDelta(sale);

  const existing = await getDailyBalance(date);
  const now = new Date().toISOString();

  if (existing) {
    const newTotal = (existing.totalSales || 0) + delta.totalSales;
    const newCash = (existing.cashSales || 0) + delta.cashSales;
    const newTransfer = (existing.transferSales || 0) + delta.transferSales;
    const newCredit = (existing.creditSales || 0) + delta.creditSales;

    const rows = await sql`
      UPDATE dailybalance
      SET totalsales = ${newTotal}, cashsales = ${newCash}, transfersales = ${newTransfer}, creditsales = ${newCredit}, updatedat = ${now}
      WHERE id = ${existing.id}
      RETURNING id
    `;

    return rows[0]?.id;
  } else {
    const rows = await sql`
      INSERT INTO dailybalance (date, totalsales, cashsales, transfersales, creditsales, updatedat)
      VALUES (${start.toISOString()}, ${delta.totalSales}, ${delta.cashSales}, ${delta.transferSales}, ${delta.creditSales}, ${now})
      RETURNING id
    `;

    return rows[0]?.id;
  }
}

// ==========================================
// CASH CLOSING METHODS
// ==========================================

export async function getCashClosingByDate(date: Date) {
  if (!sql) return null;
  const { start, end } = normalizeDateRange(date, date);

  const rows = await sql`
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
    updatedAt: new Date(data.updatedat),
  };
}

export async function getAllCashClosings() {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM cashclosings
    ORDER BY date DESC
  `;

  return rows.map((c: any) => ({
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
    updatedAt: new Date(c.updatedat),
  }));
}

export async function getRecentCashClosings(limit: number = 20) {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM cashclosings
    ORDER BY date DESC
    LIMIT ${limit}
  `;

  return rows.map((c: any) => ({
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
    updatedAt: new Date(c.updatedat),
  }));
}

export async function createCashClosing(payload: {
  date: Date;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  creditSales: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes?: string;
  closedBy?: string | null;
}) {
  if (!sql) throw new Error("Neon DB connection not available");

  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO cashclosings (date, totalsales, cashsales, transfersales, creditsales, expectedcash, actualcash, difference, notes, closedby, updatedat)
    VALUES (${payload.date.toISOString()}, ${payload.totalSales}, ${payload.cashSales}, ${payload.transferSales}, ${payload.creditSales}, ${payload.expectedCash}, ${payload.actualCash}, ${payload.difference}, ${payload.notes || ""}, ${payload.closedBy || null}, ${now})
    RETURNING id
  `;

  return rows[0]?.id;
}

// ==========================================
// SETTINGS METHODS
// ==========================================

export async function getSettingsByUserId(userId: number) {
  const defaultSettings = {
    id: 0,
    userId,
    appTitle: "Asados Ventas",
    appLogo: null,
    primaryColor: "#DC2626",
    secondaryColor: "#EF4444",
    theme: "light" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!sql) return defaultSettings;

  const rows = await sql`
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
    theme: data.theme as "light" | "dark",
    createdAt: new Date(data.createdat),
    updatedAt: new Date(data.updatedat),
  };
}

export async function upsertSettings(userId: number, data: {
  appTitle?: string;
  appLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  theme?: "light" | "dark";
}) {
  if (!sql) return undefined;
  const existing = await getSettingsByUserId(userId);
  const now = new Date().toISOString();

  if (existing && existing.id !== 0) {
    const newAppTitle = data.appTitle !== undefined ? data.appTitle : existing.appTitle;
    const newAppLogo = data.appLogo !== undefined ? data.appLogo : existing.appLogo;
    const newPrimary = data.primaryColor !== undefined ? data.primaryColor : existing.primaryColor;
    const newSecondary = data.secondaryColor !== undefined ? data.secondaryColor : existing.secondaryColor;
    const newTheme = data.theme !== undefined ? data.theme : existing.theme;

    const rows = await sql`
      UPDATE settings
      SET apptitle = ${newAppTitle}, applogo = ${newAppLogo}, primarycolor = ${newPrimary}, secondarycolor = ${newSecondary}, theme = ${newTheme}, updatedat = ${now}
      WHERE id = ${existing.id}
      RETURNING id
    `;

    return rows[0]?.id;
  } else {
    const rows = await sql`
      INSERT INTO settings (userid, apptitle, applogo, primarycolor, secondarycolor, theme, updatedat)
      VALUES (${userId}, ${data.appTitle || "Asados Ventas"}, ${data.appLogo || null}, ${data.primaryColor || "#dc2626"}, ${data.secondaryColor || "#f97316"}, ${data.theme || "light"}, ${now})
      RETURNING id
    `;

    return rows[0]?.id;
  }
}

// Product Variants queries
export async function getProductVariants(parentProductId: number) {
  return [];
}

export async function getProductsWithVariants() {
  const allProducts = await getAllProducts();
  return allProducts.map((product: any) => ({
    ...product,
    variants: []
  }));
}
