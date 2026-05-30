import type { SupabaseClient } from "@supabase/supabase-js";

// Konfig hentes fra build-time env (Vite). Anon-nøkkel er offentlig — ekte
// personvern håndheves av Row Level Security + anonym identitet pr enhet.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

const LS_UID = "sj.uid";
const LS_RECOVERY = "sj.recoveryCode";
const LS_RECOVERY_NEW = "sj.recoveryNew"; // "1" til UI har vist koden
const LS_PROFILE_INIT = "sj.profileInit"; // uid som er init'et

// F7: last @supabase/supabase-js LATEN (egen chunk).
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) =>
        createClient(url!, anonKey!, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
        }),
      )
      .catch((e) => {
        console.warn("[sync] kunne ikke laste Supabase-klient", e);
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}

// ─── Anonym identitet pr enhet ─────────────────────────────────────────────

export function cachedUid(): string | null {
  try {
    return localStorage.getItem(LS_UID);
  } catch {
    return null;
  }
}

let authPromise: Promise<string | null> | null = null;

/** Sørg for at enheten har en (anonym) identitet. Returnerer uid, eller
 *  cachet uid hvis vi er offline. */
export function ensureAuth(): Promise<string | null> {
  if (!authPromise) authPromise = doAuth();
  return authPromise;
}

async function doAuth(): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return cachedUid();
  try {
    const { data: sess } = await sb.auth.getSession();
    let uid = sess.session?.user?.id ?? null;
    if (!uid) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error || !data.user) {
        // F.eks. «Anonymous sign-ins disabled», eller offline.
        console.warn("[auth] anonym innlogging feilet", error?.message);
        authPromise = null; // la et senere forsøk prøve igjen
        return cachedUid();
      }
      uid = data.user.id;
    }
    try {
      localStorage.setItem(LS_UID, uid);
    } catch {
      /* ignorer */
    }
    await ensureProfile(sb, uid);
    return uid;
  } catch (e) {
    console.warn("[auth] feilet, bruker cachet uid", e);
    authPromise = null;
    return cachedUid();
  }
}

/** Opprett profil + gjenopprettingskode første gang (med mindre allerede gjort
 *  eller gjenopprettet). Lagrer kun hash på serveren. */
async function ensureProfile(sb: SupabaseClient, uid: string): Promise<void> {
  try {
    if (localStorage.getItem(LS_PROFILE_INIT) === uid) return;
    let code = localStorage.getItem(LS_RECOVERY);
    if (!code) {
      code = generateRecoveryCode();
      localStorage.setItem(LS_RECOVERY, code);
      localStorage.setItem(LS_RECOVERY_NEW, "1"); // UI viser den én gang
    }
    const { error } = await sb.rpc("init_profile", { p_code: code });
    if (error) throw error;
    localStorage.setItem(LS_PROFILE_INIT, uid);
  } catch (e) {
    console.warn("[auth] init_profile feilet (prøver senere)", e);
  }
}

export function getRecoveryCode(): string | null {
  try {
    return localStorage.getItem(LS_RECOVERY);
  } catch {
    return null;
  }
}
export function recoveryIsNew(): boolean {
  try {
    return localStorage.getItem(LS_RECOVERY_NEW) === "1";
  } catch {
    return false;
  }
}
export function clearRecoveryNew(): void {
  try {
    localStorage.removeItem(LS_RECOVERY_NEW);
  } catch {
    /* ignorer */
  }
}

/** Etter vellykket gjenoppretting: lagre koden lokalt + nullstill auth-cache. */
export function adoptRecoveryCode(code: string): void {
  try {
    localStorage.setItem(LS_RECOVERY, code.trim());
    localStorage.removeItem(LS_RECOVERY_NEW);
  } catch {
    /* ignorer */
  }
}

// Lesbar kode, f.eks. "K7P2-9MXR-TQ4F" — unngår forvekslbare tegn (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateRecoveryCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 4 === 0) s += "-";
    s += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return s; // 12 tegn i tre grupper, f.eks. "K7P2-9MXR-TQ4F"
}
