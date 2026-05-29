// Storage-abstraksjon.
//
// Appen er offline-først: localStorage er alltid en rask cache. Når Supabase
// er konfigurert, speiles all skriving dit, og data hentes derfra ved
// oppstart. Mister vi nett (vanlig på en golfbane) fungerer alt fortsatt
// lokalt, og synkes opp neste gang nett er tilbake.

import { supabase, supabaseConfigured } from "./lib/supabase";
import type { Player, Round } from "./types";

const LS_PLAYERS = "sj.players";
const LS_ROUNDS = "sj.rounds";

export type Backend = "supabase" | "local";

export interface Snapshot {
  players: Player[];
  rounds: Round[];
}

export interface Store {
  readonly backend: Backend;
  load(): Promise<Snapshot>;
  savePlayer(p: Player): Promise<void>;
  deletePlayer(id: string): Promise<void>;
  saveRound(r: Round): Promise<void>;
}

// ─── localStorage-hjelpere ────────────────────────────────────────────────

function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeLS<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* full eller utilgjengelig — ignorer */
  }
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}

// ─── LocalStore ───────────────────────────────────────────────────────────

class LocalStore implements Store {
  readonly backend = "local" as const;

  async load(): Promise<Snapshot> {
    return {
      players: readLS<Player>(LS_PLAYERS),
      rounds: readLS<Round>(LS_ROUNDS),
    };
  }

  async savePlayer(p: Player): Promise<void> {
    writeLS(LS_PLAYERS, upsertById(readLS<Player>(LS_PLAYERS), p));
  }

  async deletePlayer(id: string): Promise<void> {
    writeLS(LS_PLAYERS, readLS<Player>(LS_PLAYERS).filter((p) => p.id !== id));
    writeLS(LS_ROUNDS, readLS<Round>(LS_ROUNDS).filter((r) => r.player_id !== id));
  }

  async saveRound(r: Round): Promise<void> {
    writeLS(LS_ROUNDS, upsertById(readLS<Round>(LS_ROUNDS), r));
  }
}

// ─── SupabaseStore (med lokal cache) ──────────────────────────────────────

class SupabaseStore implements Store {
  readonly backend = "supabase" as const;
  private cache = new LocalStore();

  async load(): Promise<Snapshot> {
    const local = await this.cache.load();
    if (!supabase) return local;
    try {
      const [{ data: players, error: pe }, { data: rounds, error: re }] = await Promise.all([
        supabase.from("players").select("*").order("created_at", { ascending: true }),
        supabase.from("rounds").select("*").order("created_at", { ascending: true }),
      ]);
      if (pe || re) throw pe || re;

      const remote: Snapshot = {
        players: (players ?? []) as Player[],
        rounds: (rounds ?? []) as Round[],
      };

      // Push opp evt. lokalt-laget data som ikke finnes i remote (offline-kø).
      await this.pushMissing(local, remote);

      // Union (remote vinner pr id), persister cache.
      const merged = this.union(local, remote);
      writeLS(LS_PLAYERS, merged.players);
      writeLS(LS_ROUNDS, merged.rounds);
      return merged;
    } catch {
      // Nett nede → bruk cache.
      return local;
    }
  }

  async savePlayer(p: Player): Promise<void> {
    await this.cache.savePlayer(p);
    if (supabase) {
      try {
        await supabase.from("players").upsert(p);
      } catch {
        /* synkes ved neste load */
      }
    }
  }

  async deletePlayer(id: string): Promise<void> {
    await this.cache.deletePlayer(id);
    if (supabase) {
      try {
        await supabase.from("rounds").delete().eq("player_id", id);
        await supabase.from("players").delete().eq("id", id);
      } catch {
        /* ignorer */
      }
    }
  }

  async saveRound(r: Round): Promise<void> {
    await this.cache.saveRound(r);
    if (supabase) {
      try {
        await supabase.from("rounds").upsert(r);
      } catch {
        /* synkes ved neste load */
      }
    }
  }

  private union(local: Snapshot, remote: Snapshot): Snapshot {
    let players = remote.players;
    for (const p of local.players) if (!players.some((x) => x.id === p.id)) players = [...players, p];
    let rounds = remote.rounds;
    for (const r of local.rounds) if (!rounds.some((x) => x.id === r.id)) rounds = [...rounds, r];
    return { players, rounds };
  }

  private async pushMissing(local: Snapshot, remote: Snapshot): Promise<void> {
    if (!supabase) return;
    const newPlayers = local.players.filter((p) => !remote.players.some((x) => x.id === p.id));
    const newRounds = local.rounds.filter((r) => !remote.rounds.some((x) => x.id === r.id));
    try {
      if (newPlayers.length) await supabase.from("players").upsert(newPlayers);
      if (newRounds.length) await supabase.from("rounds").upsert(newRounds);
    } catch {
      /* prøver igjen neste gang */
    }
  }
}

// ─── Fabrikk ──────────────────────────────────────────────────────────────

export const store: Store = supabaseConfigured ? new SupabaseStore() : new LocalStore();

export function newId(): string {
  // crypto.randomUUID finnes i alle moderne mobilnettlesere.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
