import type { SupabaseClient } from "@supabase/supabase-js";

// Konfig hentes fra build-time env (Vite). Anon-nøkkel er ment å være
// offentlig — den beskyttes av Row Level Security i Supabase.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

// F7: last @supabase/supabase-js LATEN (egen chunk). Appen starter og
// fungerer offline uten å betale for klient-biblioteket i hovedbundelen.
// `import type` over er ren type og havner aldri i bundelen.
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) => createClient(url!, anonKey!))
      .catch((e) => {
        // Klarte ikke laste biblioteket (offline ved første åpning) — kjør lokalt.
        console.warn("[sync] kunne ikke laste Supabase-klient", e);
        clientPromise = null; // la et senere forsøk prøve igjen
        return null;
      });
  }
  return clientPromise;
}
