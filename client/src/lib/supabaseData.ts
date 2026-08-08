// DEPRECATED: Supabase data access layer - no longer used
// All data now comes from MySQL backend via tRPC

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
  return product as SupabaseProductRow;
}

export async function fetchSupabaseProducts() {
  // DEPRECATED: Use tRPC client instead
  return null;
}

export async function fetchSupabaseInventory(date = new Date()) {
  // DEPRECATED: Use tRPC client instead
  return null;
}

export async function createSupabaseProduct(payload: SupabaseProductPayload) {
  // DEPRECATED: Use tRPC client instead
  return null;
}

export async function upsertSupabaseInventory(payload: SupabaseInventoryPayload) {
  // DEPRECATED: Use tRPC client instead
  return null;
}
