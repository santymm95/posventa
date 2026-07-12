import { supabaseServer, hasSupabaseConfig } from './supabase';
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

// Mock Drizzle getDb to return null since we're using Supabase directly
export async function getDb() {
  return null;
}

// ==========================================
// USER METHODS
// ==========================================

export async function getUserByEmail(email: string) {
  if (!supabaseServer) return undefined;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('email', normalized)
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

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
  if (!supabaseServer) return undefined;
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('openid', openId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

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
  if (!supabaseServer) return undefined;
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

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
  if (!supabaseServer) return [];
  const { data, error } = await supabaseServer
    .from('users')
    .select('id, name, email, role, createdat')
    .order('createdat', { ascending: true });

  if (error || !data) return [];

  return data.map((u: any) => ({
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
  if (!supabaseServer) throw new Error("Supabase connection not available");

  const { data, error } = await supabaseServer
    .from('users')
    .insert({
      openid: payload.openId,
      email: payload.email.trim().toLowerCase(),
      password: payload.password || null,
      name: payload.name || payload.email,
      loginmethod: payload.loginMethod,
      role: payload.role,
      lastsignedin: new Date().toISOString(),
      updatedat: new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) {
    console.error("[Supabase] Failed to create user:", error);
    throw error;
  }

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
  if (!supabaseServer) return;

  const insertObj: any = {
    openid: user.openId,
    updatedat: new Date().toISOString()
  };

  if (user.name !== undefined) insertObj.name = user.name;
  if (user.email !== undefined) insertObj.email = user.email?.trim().toLowerCase();
  if (user.loginMethod !== undefined) insertObj.loginmethod = user.loginMethod;
  if (user.role !== undefined) insertObj.role = user.role;
  if (user.lastSignedIn !== undefined) insertObj.lastsignedin = user.lastSignedIn.toISOString();

  const { error } = await supabaseServer
    .from('users')
    .upsert(insertObj, { onConflict: 'openid' });

  if (error) {
    console.error("[Supabase] Failed to upsert user:", error);
    throw error;
  }
}

export async function deleteUser(id: number) {
  if (!supabaseServer) throw new Error("Supabase connection not available");
  const { error } = await supabaseServer
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Supabase] Failed to delete user:", error);
    throw error;
  }
}

// ==========================================
// PRODUCT METHODS
// ==========================================

export async function getAllProducts() {
  if (!supabaseServer) return [];
  const { data, error } = await supabaseServer
    .from('products')
    .select('*')
    .eq('active', 1)
    .order('createdat', { ascending: false });

  if (error || !data) {
    console.error('[Supabase] Failed to fetch products:', error);
    return [];
  }

  return data.map((p: any) => ({
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
  if (!supabaseServer) return undefined;
  const { data, error } = await supabaseServer
    .from('products')
    .select('*')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

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
  if (!supabaseServer) throw new Error("Supabase connection not available");

  const { data, error } = await supabaseServer
    .from("products")
    .insert({
      name,
      description: "",
      price,
      image: image || "",
      category: "General",
      parentproductid: parentProductId ?? null,
      active: 1,
      updatedat: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    console.error("[Supabase] Failed to create product:", error);
    throw error;
  }

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
  if (!supabaseServer) throw new Error("Supabase connection not available");

  const updateObj: any = {
    updatedat: new Date().toISOString()
  };
  if (data.name !== undefined) updateObj.name = data.name;
  if (data.price !== undefined) updateObj.price = data.price;
  if (data.image !== undefined) updateObj.image = data.image;

  const { error } = await supabaseServer
    .from('products')
    .update(updateObj)
    .eq('id', id);

  if (error) {
    console.error("[Supabase] Failed to update product:", error);
    throw error;
  }

  return getProductById(id);
}

export async function deleteProduct(id: number) {
  if (!supabaseServer) throw new Error("Supabase connection not available");
  const { error } = await supabaseServer
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("[Supabase] Failed to delete product:", error);
    throw error;
  }

  return { success: true };
}

// ==========================================
// INVENTORY METHODS
// ==========================================

export async function getTodayInventory() {
  if (!supabaseServer) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabaseServer
    .from('inventory')
    .select('*')
    .gte('date', today.toISOString())
    .lt('date', tomorrow.toISOString());

  if (error || !data) {
    console.error("[Supabase] Failed to get today inventory:", error);
    return [];
  }

  return data.map((i: any) => ({
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
  if (!supabaseServer) return undefined;
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setDate(dateEnd.getDate() + 1);

  const { data, error } = await supabaseServer
    .from('inventory')
    .select('*')
    .eq('productid', productId)
    .gte('date', dateStart.toISOString())
    .lt('date', dateEnd.toISOString())
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

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
  if (!supabaseServer) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await getInventoryByProductAndDate(productId, today);

  if (existing) {
    const newQuantity = (existing.quantity || 0) + quantity;
    const { error } = await supabaseServer
      .from('inventory')
      .update({
        quantity: newQuantity,
        previousdayquantity: previousDayQuantity !== 0 ? previousDayQuantity : existing.previousDayQuantity,
        notes,
        updatedat: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error("[Supabase] Failed to update inventory:", error);
      return undefined;
    }
    return existing.id;
  } else {
    const { data, error } = await supabaseServer
      .from('inventory')
      .insert({
        productid: productId,
        date: today.toISOString(),
        quantity,
        previousdayquantity: previousDayQuantity,
        sold: 0,
        remaining: quantity,
        notes,
        updatedat: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error("[Supabase] Failed to insert inventory:", error);
      return undefined;
    }
    return data?.id;
  }
}

// ==========================================
// SALES METHODS
// ==========================================

export async function getSalesByDate(date: Date) {
  if (!supabaseServer) return [];
  const { start, end } = normalizeDateRange(date, date);

  const { data, error } = await supabaseServer
    .from('sales')
    .select('*')
    .gte('date', start.toISOString())
    .lte('date', end.toISOString());

  if (error || !data) {
    console.error("[Supabase] Failed to get sales by date:", error);
    return [];
  }

  return data.map((s: any) => ({
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
  if (!supabaseServer) return [];
  const { start, end } = normalizeDateRange(startDate, endDate);

  const { data, error } = await supabaseServer
    .from('sales')
    .select('*')
    .gte('date', start.toISOString())
    .lte('date', end.toISOString());

  if (error || !data) {
    console.error("[Supabase] Failed to get sales by range:", error);
    return [];
  }

  return data.map((s: any) => ({
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
  if (!supabaseServer) throw new Error("Supabase connection not available");

  const { data, error } = await supabaseServer
    .from('sales')
    .insert({
      productid: payload.productId,
      quantity: payload.quantity,
      unitprice: payload.unitPrice,
      totalprice: payload.totalPrice,
      paymentmethod: payload.paymentMethod,
      date: payload.date.toISOString(),
      updatedat: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error("[Supabase] Failed to create sale:", error);
    throw error;
  }

  return data?.id;
}

// ==========================================
// EXPENSES METHODS
// ==========================================

export async function getExpensesByDate(date: Date) {
  if (!supabaseServer) return [];
  const { start, end } = normalizeDateRange(date, date);
  try {
    console.debug('[Supabase] getExpensesByDate start/end:', start.toISOString(), end.toISOString());
    const { data, error } = await supabaseServer
      .from('expenses')
      .select('*')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString());

    if (error) {
      console.error("[Supabase] Failed to get expenses by date:", error);
      return [];
    }

    if (!data) {
      console.warn('[Supabase] getExpensesByDate returned no data (null)');
      return [];
    }

    const mapped = data.map((e: any) => ({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      amount: e.amount,
      createdBy: e.closedby || e.createdby || null,
      createdAt: new Date(e.createdat),
    }));

    console.debug('[Supabase] getExpensesByDate mapped count:', mapped.length);
    return mapped;
  } catch (err) {
    console.error('[Supabase] Exception in getExpensesByDate:', err);
    return [];
  }
}

export async function getRecentExpenses(limit: number = 20) {
  if (!supabaseServer) return [];
  const { data, error } = await supabaseServer
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("[Supabase] Failed to get recent expenses:", error);
    return [];
  }

  return data.map((e: any) => ({
    id: e.id,
    date: new Date(e.date),
    description: e.description,
    amount: e.amount,
    createdBy: e.closedby || e.createdby || null,
    createdAt: new Date(e.createdat),
  }));
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
  if (!supabaseServer) return [];
  const { start, end } = normalizeDateRange(startDate, endDate);
  try {
    console.debug('[Supabase] getExpensesByDateRange start/end:', start.toISOString(), end.toISOString());
    const { data, error } = await supabaseServer
      .from('expenses')
      .select('*')
      .gte('date', start.toISOString())
      .lte('date', end.toISOString())
      .order('date', { ascending: true });

    if (error) {
      console.error("[Supabase] Failed to get expenses by range:", error);
      return [];
    }

    if (!data) {
      console.warn('[Supabase] getExpensesByDateRange returned no data (null)');
      return [];
    }

    const mapped = data.map((e: any) => ({
      id: e.id,
      date: new Date(e.date),
      description: e.description,
      amount: e.amount,
      createdBy: e.createdby || null,
      createdAt: new Date(e.createdat),
    }));

    console.debug('[Supabase] getExpensesByDateRange mapped count:', mapped.length);
    return mapped;
  } catch (err) {
    console.error('[Supabase] Exception in getExpensesByDateRange:', err);
    return [];
  }
}

export async function createExpense(payload: { date: Date; description?: string; amount: number; createdBy?: string | null; }) {
  if (!supabaseServer) throw new Error("Supabase connection not available");

  const { data, error } = await supabaseServer
    .from('expenses')
    .insert({
      date: payload.date.toISOString(),
      description: payload.description || "",
      amount: payload.amount,
      createdby: payload.createdBy || null,
      updatedat: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error("[Supabase] Failed to create expense:", error);
    throw error;
  }

  return data?.id;
}

// ==========================================
// DAILY BALANCE METHODS
// ==========================================

export async function getDailyBalance(date: Date) {
  if (!supabaseServer) return undefined;
  const { start, end } = normalizeDateRange(date, date);

  const { data, error } = await supabaseServer
    .from('dailybalance')
    .select('*')
    .gte('date', start.toISOString())
    .lte('date', end.toISOString())
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

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
  if (!supabaseServer) return undefined;
  const { start, end } = normalizeDateRange(date, date);
  const delta = buildDailyBalanceDelta(sale);

  const existing = await getDailyBalance(date);

  if (existing) {
    const { data, error } = await supabaseServer
      .from('dailybalance')
      .update({
        totalsales: (existing.totalSales || 0) + delta.totalSales,
        cashsales: (existing.cashSales || 0) + delta.cashSales,
        transfersales: (existing.transferSales || 0) + delta.transferSales,
        creditsales: (existing.creditSales || 0) + delta.creditSales,
        updatedat: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) {
      console.error("[Supabase] Failed to update daily balance:", error);
      return undefined;
    }
    return data?.id;
  } else {
    const { data, error } = await supabaseServer
      .from('dailybalance')
      .insert({
        date: start.toISOString(),
        totalsales: delta.totalSales,
        cashsales: delta.cashSales,
        transfersales: delta.transferSales,
        creditsales: delta.creditSales,
        updatedat: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error("[Supabase] Failed to insert daily balance:", error);
      return undefined;
    }
    return data?.id;
  }
}

// ==========================================
// CASH CLOSING METHODS
// ==========================================

export async function getCashClosingByDate(date: Date) {
  if (!supabaseServer) return null;
  const { start, end } = normalizeDateRange(date, date);

  const { data, error } = await supabaseServer
    .from('cashclosings')
    .select('*')
    .gte('date', start.toISOString())
    .lte('date', end.toISOString())
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

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
  if (!supabaseServer) return [];
  const { data, error } = await supabaseServer
    .from('cashclosings')
    .select('*')
    .order('date', { ascending: false });

  if (error || !data) return [];

  return data.map((c: any) => ({
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
  if (!supabaseServer) return [];
  const { data, error } = await supabaseServer
    .from('cashclosings')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((c: any) => ({
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
  if (!supabaseServer) throw new Error("Supabase connection not available");

  const { data, error } = await supabaseServer
    .from('cashclosings')
    .insert({
      date: payload.date.toISOString(),
      totalsales: payload.totalSales,
      cashsales: payload.cashSales,
      transfersales: payload.transferSales,
      creditsales: payload.creditSales,
      expectedcash: payload.expectedCash,
      actualcash: payload.actualCash,
      difference: payload.difference,
      notes: payload.notes || "",
      closedby: payload.closedBy || null,
      updatedat: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) {
    console.error("[Supabase] Failed to create cash closing:", error);
    throw error;
  }

  return data?.id;
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

  if (!supabaseServer) return defaultSettings;

  const { data, error } = await supabaseServer
    .from('settings')
    .select('*')
    .eq('userid', userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return defaultSettings;

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
  if (!supabaseServer) return undefined;
  const existing = await getSettingsByUserId(userId);

  if (existing && existing.id !== 0) {
    const updateObj: any = {
      updatedat: new Date().toISOString()
    };
    if (data.appTitle !== undefined) updateObj.apptitle = data.appTitle;
    if (data.appLogo !== undefined) updateObj.applogo = data.appLogo;
    if (data.primaryColor !== undefined) updateObj.primarycolor = data.primaryColor;
    if (data.secondaryColor !== undefined) updateObj.secondarycolor = data.secondaryColor;
    if (data.theme !== undefined) updateObj.theme = data.theme;

    const { data: updated, error } = await supabaseServer
      .from('settings')
      .update(updateObj)
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) {
      console.error("[Supabase] Failed to update settings:", error);
      return undefined;
    }
    return updated?.id;
  } else {
    const { data: inserted, error } = await supabaseServer
      .from('settings')
      .insert({
        userid: userId,
        apptitle: data.appTitle || "Asados Ventas",
        applogo: data.appLogo || null,
        primarycolor: data.primaryColor || "#dc2626",
        secondarycolor: data.secondaryColor || "#f97316",
        theme: data.theme || "light",
        updatedat: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error("[Supabase] Failed to insert settings:", error);
      return undefined;
    }
    return inserted?.id;
  }
}

// Product Variants queries (Mocked/Unused since DB doesn't have variants table)
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
