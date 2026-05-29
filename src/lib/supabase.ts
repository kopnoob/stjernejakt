import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Konfig hentes fra build-time env (Vite). Anon-nøkkel er ment å være
// offentlig — den beskyttes av Row Level Security i Supabase.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!)
  : null;
