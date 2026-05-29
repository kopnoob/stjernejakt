// Storage-abstraksjon.
//
// Offline-først: localStorage er alltid en rask, robust cache. Når Supabase
// er konfigurert speiles skriving dit (insert-only), og data hentes derfra
// ved oppstart. Mister vi nett (vanlig på en golfbane) fungerer alt lokalt.
//
// Designvalg for robusthet + sikkerhet:
//  - players/rounds er INSERT-only (RLS tillater ikke update/delete for anon).
//    Hver rad har en unik id og endres aldri → ingen kryss-enhet-overskriving.
//  - "current_hcp" (hvilket handicap boardet fokuserer på) er en LOKAL
//    enhets-preferanse, ikke et delt felt. Hindrer at to enheter overskriver
//    hverandres "hvor er jeg"-peker.
//  - Sletting er en LOKAL tombstone (skjuler raden på denne enheten). Raden
//    blir liggende i Supabase; permanent fjerning gjøres i dashboardet.

import { getSupabase, supabaseConfigured } from "./lib/supabase";
import type { Player, Round } from "./types";

const LS_PLAYERS = "sj.players";
const LS_ROUNDS = "sj.rounds";
const LS_DELETIONS = "sj.deletions"; // string[] av skjulte spiller-id-er
const LS_CURRENT_HCP = "sj.currentHcp"; // { [playerId]: hcp }
const LS_PENDING = "sj.pendingSync"; // ids som ennå ikke er bekreftet pushet

export type Backend = "supabase" | "local";

export interface Snapshot {
  players: Player[];
  rounds: Round[];
  /** True hvis vi faktisk fikk data fra skyen (ikke bare cache). */
  syncedRemote: boolean;
}

export interface SaveResult {
  /** True hvis raden ble bekreftet skrevet til skyen. */
  synced: boolean;
}

export interface Store {
  readonly backend: Backend;
  load(): Promise<Snapshot>;
  savePlayer(p: Player): Promise<SaveResult>;
  deletePlayer(id: string): Promise<SaveResult>;
  saveRound(r: Round): Promise<SaveResult>;
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
function writeLS<T>(key: string, items: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch {
    return false; // full / privat modus — la caller vite det
  }
}
function readObj<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}
function writeObj<T>(key: string, obj: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    /* ignorer */
  }
}
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [...list, item];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}

// ─── current_hcp (lokal enhets-preferanse) ────────────────────────────────

export function getCurrentHcp(playerId: string): number {
  const map = readObj<number>(LS_CURRENT_HCP);
  return map[playerId] ?? 5;
}
export function setCurrentHcpLocal(playerId: string, hcp: number): void {
  const map = readObj<number>(LS_CURRENT_HCP);
  map[playerId] = hcp;
  writeObj(LS_CURRENT_HCP, map);
}

// ─── Tombstones (lokal sletting) ──────────────────────────────────────────

function readDeletions(): string[] {
  return readLS<string>(LS_DELETIONS);
}
function addDeletion(id: string): void {
  const set = new Set(readDeletions());
  set.add(id);
  writeLS(LS_DELETIONS, [...set]);
}

// ─── LocalStore ───────────────────────────────────────────────────────────

class LocalStore implements Store {
  readonly backend = "local" as const;

  async load(): Promise<Snapshot> {
    const deleted = new Set(readDeletions());
    const players = readLS<Player>(LS_PLAYERS).filter((p) => !deleted.has(p.id));
    const rounds = readLS<Round>(LS_ROUNDS).filter((r) => !deleted.has(r.player_id));
    return { players, rounds, syncedRemote: false };
  }

  async savePlayer(p: Player): Promise<SaveResult> {
    writeLS(LS_PLAYERS, upsertById(readLS<Player>(LS_PLAYERS), p));
    return { synced: false };
  }

  async deletePlayer(id: string): Promise<SaveResult> {
    addDeletion(id);
    writeLS(LS_PLAYERS, readLS<Player>(LS_PLAYERS).filter((p) => p.id !== id));
    writeLS(LS_ROUNDS, readLS<Round>(LS_ROUNDS).filter((r) => r.player_id !== id));
    return { synced: false };
  }

  async saveRound(r: Round): Promise<SaveResult> {
    writeLS(LS_ROUNDS, upsertById(readLS<Round>(LS_ROUNDS), r));
    return { synced: false };
  }
}

// ─── SupabaseStore (insert-only + lokal cache) ────────────────────────────

/** Felter som faktisk finnes i players-tabellen (current_hcp er lokal). */
function playerRow(p: Player) {
  return { id: p.id, name: p.name, color: p.color, avatar: p.avatar ?? null, created_at: p.created_at };
}

class SupabaseStore implements Store {
  readonly backend = "supabase" as const;
  private cache = new LocalStore();

  async load(): Promise<Snapshot> {
    const local = await this.cache.load();
    const sb = await getSupabase();
    if (!sb) return local;
    try {
      const [{ data: players, error: pe }, { data: rounds, error: re }] = await Promise.all([
        sb.from("players").select("*").order("created_at", { ascending: true }),
        sb.from("rounds").select("*").order("created_at", { ascending: true }),
      ]);
      if (pe || re) throw pe || re;

      const deleted = new Set(readDeletions());
      const remotePlayers = ((players ?? []) as Player[]).filter((p) => !deleted.has(p.id));
      const remoteRounds = ((rounds ?? []) as Round[]).filter((r) => !deleted.has(r.player_id));

      // Push opp lokalt-laget data som ikke finnes i remote (offline-kø).
      await this.pushMissing(remotePlayers, remoteRounds);

      // Union: remote + lokale-bare-rader (begge er uforanderlige).
      const merged = this.union(
        { players: remotePlayers, rounds: remoteRounds },
        await this.cache.load(),
      );
      writeLS(LS_PLAYERS, merged.players);
      writeLS(LS_ROUNDS, merged.rounds);
      writeLS(LS_PENDING, []); // alt synket
      return { ...merged, syncedRemote: true };
    } catch (e) {
      logSync("load feilet, bruker cache", e);
      return local; // syncedRemote: false
    }
  }

  async savePlayer(p: Player): Promise<SaveResult> {
    await this.cache.savePlayer(p);
    return this.tryInsert("players", playerRow(p), p.id);
  }

  async saveRound(r: Round): Promise<SaveResult> {
    await this.cache.saveRound(r);
    return this.tryInsert("rounds", r, r.id);
  }

  async deletePlayer(id: string): Promise<SaveResult> {
    // RLS tillater ikke delete for anon — sletting er lokal skjuling.
    await this.cache.deletePlayer(id);
    return { synced: false };
  }

  private async tryInsert(table: string, row: object, id: string): Promise<SaveResult> {
    const sb = await getSupabase();
    if (!sb) return { synced: false };
    try {
      const { error } = await sb.from(table).insert(row);
      if (error) throw error;
      return { synced: true };
    } catch (e) {
      // Marker som ventende slik at neste load prøver igjen.
      const pending = new Set(readLS<string>(LS_PENDING));
      pending.add(id);
      writeLS(LS_PENDING, [...pending]);
      logSync(`insert i ${table} feilet (synkes senere)`, e);
      return { synced: false };
    }
  }

  private union(remote: { players: Player[]; rounds: Round[] }, local: Snapshot) {
    let players = remote.players;
    for (const p of local.players) if (!players.some((x) => x.id === p.id)) players = [...players, p];
    let rounds = remote.rounds;
    for (const r of local.rounds) if (!rounds.some((x) => x.id === r.id)) rounds = [...rounds, r];
    return { players, rounds };
  }

  private async pushMissing(remotePlayers: Player[], remoteRounds: Round[]): Promise<void> {
    const sb = await getSupabase();
    if (!sb) return;
    const deleted = new Set(readDeletions());
    const localPlayers = readLS<Player>(LS_PLAYERS).filter((p) => !deleted.has(p.id));
    const localRounds = readLS<Round>(LS_ROUNDS).filter((r) => !deleted.has(r.player_id));
    const newPlayers = localPlayers.filter((p) => !remotePlayers.some((x) => x.id === p.id));
    const newRounds = localRounds.filter((r) => !remoteRounds.some((x) => x.id === r.id));
    try {
      if (newPlayers.length) {
        const { error } = await sb.from("players").insert(newPlayers.map(playerRow));
        if (error) throw error;
        remotePlayers.push(...newPlayers);
      }
      if (newRounds.length) {
        const { error } = await sb.from("rounds").insert(newRounds);
        if (error) throw error;
        remoteRounds.push(...newRounds);
      }
    } catch (e) {
      logSync("pushMissing feilet (prøver igjen senere)", e);
    }
  }
}

function logSync(msg: string, e?: unknown) {
  // Skille app-feil fra nettfeil er nyttig i konsollen; brukeren ser
  // synkstatus i UI (se useApp).
  console.warn(`[sync] ${msg}`, e ?? "");
}

// ─── Fabrikk ──────────────────────────────────────────────────────────────

export const store: Store = supabaseConfigured ? new SupabaseStore() : new LocalStore();

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
