import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "")?.trim();
// Prefer service role key but fall back to anon key for development when service key is not provided
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

function isValidSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export const supabaseServer = isValidSupabaseConfig()
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export function hasSupabaseConfig() {
  return Boolean(supabaseServer);
}

export async function upsertSupabaseProduct(payload: {
  id?: number;
  name: string;
  price: number;
  image?: string | null;
  category?: string | null;
  active?: number | null;
  parentProductId?: number | null;
}) {
  if (!supabaseServer) return null;

  // Build payload only with fields expected by Supabase/PostgREST to avoid schema errors
  const insertObj: any = {
    id: payload.id,
    name: payload.name,
    price: payload.price,
    image: payload.image ?? "",
    category: payload.category ?? "",
    active: payload.active ?? 1,
  };

  // Only include parentProductId if explicitly provided (and not null)
  if (payload.parentProductId !== undefined && payload.parentProductId !== null) {
    insertObj.parentProductId = payload.parentProductId;
  }

  const { data, error } = await supabaseServer.from("products").upsert(insertObj).select("*").single();

  if (error) {
    console.error("Supabase product upsert failed:", error);
    return null;
  }

  return data;
}

export async function createSupabaseSale(payload: {
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: "efectivo" | "transferencia" | "fiado";
  date?: Date;
  notes?: string | null;
}) {
  if (!supabaseServer) return null;

  const { data, error } = await supabaseServer.from("sales").insert({
    productId: payload.productId,
    quantity: payload.quantity,
    unitPrice: payload.unitPrice,
    totalPrice: payload.totalPrice,
    paymentMethod: payload.paymentMethod,
    date: payload.date ?? new Date().toISOString(),
    notes: payload.notes ?? "",
  }).select("*").single();

  if (error) {
    console.error("Supabase sale insert failed:", error);
    return null;
  }

  return data;
}
