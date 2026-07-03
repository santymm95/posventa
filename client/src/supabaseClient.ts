import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes("supabase.co");
  } catch {
    return false;
  }
}

const supabaseUrl = isValidSupabaseUrl(rawSupabaseUrl) ? rawSupabaseUrl : undefined;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  const message = supabaseUrl
    ? "Supabase anon key is missing. Set VITE_SUPABASE_ANON_KEY in .env."
    : "Supabase URL is invalid. Set VITE_SUPABASE_URL to your project URL, for example https://xyz.supabase.co";
  console.warn(message);
}

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
