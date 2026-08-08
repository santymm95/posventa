// Supabase has been removed - using local MySQL backend
export const supabaseServer = null;

export function hasSupabaseConfig() {
  return false;
}

// Legacy functions return null - all data goes through tRPC
export async function upsertSupabaseProduct(payload: any) {
  return null;
}

export async function createSupabaseSale(payload: any) {
  return null;
}
