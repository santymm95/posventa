import { supabase } from "../supabaseClient";

export interface SupabaseProductRow {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  category?: string | null;
  parentProductId?: number | null;
  active?: number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface SupabaseInventoryRow {
  id: number;
  productId: number;
  date?: string | Date | null;
  quantity: number;
  previousDayQuantity?: number | null;
  sold?: number | null;
  remaining?: number | null;
  notes?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface SupabaseProductPayload {
  name: string;
  price: number;
  image?: string | null;
  category?: string;
  active?: number;
  parentProductId?: number | null;
}

export interface SupabaseInventoryPayload {
  productId: number;
  quantity: number;
  previousDayQuantity?: number;
  notes?: string;
}

export function normalizeSupabaseProductRow(product: Partial<SupabaseProductRow> | null | undefined) {
  if (!product) return null;

  // Supabase/PostgREST often returns lowercase column keys (createdat, parentproductid, etc.).
  const raw: any = product;
  return {
    ...product,
    id: Number(raw.id ?? raw.ID ?? 0),
    name: raw.name ?? raw.nombre ?? "Producto",
    price: Number(raw.price ?? raw.precio ?? 0),
    image: raw.image ?? raw.imagen ?? "",
    category: raw.category ?? raw.categoria ?? "",
    parentProductId: raw.parentProductId ?? raw.parentproductid ?? raw.parent_product_id ?? null,
    active: raw.active ?? 1,
    createdAt: raw.createdAt ?? raw.createdat ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updatedat ?? raw.updated_at ?? null,
  };
}

export async function fetchSupabaseProducts() {
  if (!supabase) return null;

  // Supabase lower-cases column names in the REST API; use lowercased column name
  const { data, error } = await supabase.from("products").select("*").order("createdat", { ascending: false });

  if (error) {
    console.error("Error loading products from Supabase:", error);
    return null;
  }

  return (data ?? []).map((product) => normalizeSupabaseProductRow(product as Partial<SupabaseProductRow>));
}

export async function fetchSupabaseInventory(date = new Date()) {
  if (!supabase) return null;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .gte("date", start.toISOString())
    .lte("date", end.toISOString())
    // Use lowercased column name for ordering to match Supabase/Postgres
    .order("createdat", { ascending: false });

  if (error) {
    console.error("Error loading inventory from Supabase:", error);
    return null;
  }

  // Normalize row keys (productid -> productId, previousdayquantity -> previousDayQuantity, createdat -> createdAt)
  return (data ?? []).map((row: any) => {
    return {
      id: Number(row.id ?? row.ID ?? 0),
      productId: Number(row.productId ?? row.productid ?? row.product_id ?? 0),
      date: row.date ?? row.date,
      quantity: Number(row.quantity ?? 0),
      previousDayQuantity: Number(row.previousDayQuantity ?? row.previousdayquantity ?? row.previous_day_quantity ?? 0),
      sold: Number(row.sold ?? 0),
      remaining: Number(row.remaining ?? 0),
      notes: row.notes ?? null,
      createdAt: row.createdAt ?? row.createdat ?? row.created_at ?? null,
      updatedAt: row.updatedAt ?? row.updatedat ?? row.updated_at ?? null,
    } as SupabaseInventoryRow;
  });
}

export async function createSupabaseProduct(payload: SupabaseProductPayload) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: payload.name,
      price: Math.round(payload.price * 100),
      image: payload.image ?? "",
      category: payload.category ?? "",
      active: payload.active ?? 1,
      parentProductId: payload.parentProductId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating product in Supabase:", error);
    return null;
  }

  return data;
}

export async function upsertSupabaseInventory(payload: SupabaseInventoryPayload) {
  if (!supabase) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("inventory")
    .upsert({
      productId: payload.productId,
      date: today.toISOString(),
      quantity: payload.quantity,
      previousDayQuantity: payload.previousDayQuantity ?? 0,
      notes: payload.notes ?? "",
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error upserting inventory in Supabase:", error);
    return null;
  }

  return data;
}
