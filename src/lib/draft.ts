// Autosave av aktiv runde til localStorage, så tastede slag ikke går tapt ved
// reload (SW-oppdatering), tilbake-trykk, innkommende telefon eller batteridød.
// Lagres løpende, leses ved oppstart, og tømmes når runden lagres.

import type { HoleResult } from "../types";

export interface RoundDraft {
  hcp: number;
  distance: number;
  holes: HoleResult[];
}
export interface FlightDraft {
  distanceBy: Record<string, number>;
  holesBy: Record<string, HoleResult[]>;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* full / privat modus */
  }
}
function del(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignorer */
  }
}

/** True hvis minst ett hull har fått input (slag eller plukk opp). */
export function holesHaveInput(holes: HoleResult[]): boolean {
  return holes.some((h) => h.pickedUp || h.strokes > 0);
}

// ─── Solorunde (pr spiller) ────────────────────────────────────────────────
const roundKey = (playerId: string) => `sj.draft.${playerId}`;
export const getRoundDraft = (playerId: string) => read<RoundDraft>(roundKey(playerId));
export const saveRoundDraft = (playerId: string, d: RoundDraft) => write(roundKey(playerId), d);
export const clearRoundDraft = (playerId: string) => del(roundKey(playerId));

// ─── Flight (pr sett av spiller-id-er) ─────────────────────────────────────
const flightKey = (ids: string[]) => `sj.draftFlight.${[...ids].sort().join(",")}`;
export const getFlightDraft = (ids: string[]) => read<FlightDraft>(flightKey(ids));
export const saveFlightDraft = (ids: string[], d: FlightDraft) => write(flightKey(ids), d);
export const clearFlightDraft = (ids: string[]) => del(flightKey(ids));
