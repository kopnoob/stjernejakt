// Turnering-modus — egen kategori, uavhengig av Stjernejakt-stjernene.
//
// En turnering tracker en flight over N hull (default 6) med vanlig
// slag-telling og en live ledertavle (lavest total vinner). Data lagres
// LOKALT (localStorage) på enheten som tracker — fungerer offline på banen,
// og overlever at appen lukkes. (Ikke skyspeilet ennå.)

import { newId } from "../store";

export interface TPlayer {
  id: string;
  name: string;
  color: string;
  avatar: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  date: string; // ISO (visning)
  holes: number; // antall hull
  players: TPlayer[];
  /** playerId → slag pr hull (lengde = holes). 0 = ikke ført. */
  scores: Record<string, number[]>;
  createdAt: string;
  done: boolean;
}

const KEY = "sj.tournaments";

function readAll(): Tournament[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Tournament[]) : [];
  } catch {
    return [];
  }
}
function writeAll(list: Tournament[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* full / privat modus */
  }
}

export function listTournaments(): Tournament[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // nyeste først
}
export function getTournament(id: string): Tournament | null {
  return readAll().find((t) => t.id === id) ?? null;
}
export function saveTournament(t: Tournament): void {
  const list = readAll();
  const i = list.findIndex((x) => x.id === t.id);
  if (i === -1) list.push(t);
  else list[i] = t;
  writeAll(list);
}
export function deleteTournament(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

export function createTournament(name: string, holes: number, players: TPlayer[]): Tournament {
  const now = new Date().toISOString();
  const t: Tournament = {
    id: newId(),
    name: name.trim() || "Turnering",
    date: now,
    holes,
    players,
    scores: Object.fromEntries(players.map((p) => [p.id, Array(holes).fill(0)])),
    createdAt: now,
    done: false,
  };
  saveTournament(t);
  return t;
}

// ─── Beregninger ──────────────────────────────────────────────────────────

export interface Standing {
  player: TPlayer;
  total: number;
  thru: number; // antall hull ført
  rank: number; // 0 = ikke spilt noe ennå
}

export function totalFor(t: Tournament, playerId: string): number {
  return (t.scores[playerId] ?? []).reduce((s, n) => s + (n || 0), 0);
}
export function thruFor(t: Tournament, playerId: string): number {
  return (t.scores[playerId] ?? []).filter((n) => n > 0).length;
}

export function standings(t: Tournament): Standing[] {
  const rows = t.players.map((p) => ({
    player: p,
    total: totalFor(t, p.id),
    thru: thruFor(t, p.id),
  }));
  rows.sort((a, b) => {
    if (a.thru === 0 && b.thru === 0) return 0;
    if (a.thru === 0) return 1; // ikke-spilte sist
    if (b.thru === 0) return -1;
    return a.total - b.total; // lavest total vinner
  });
  // Delt plassering ved lik (total, thru).
  let rank = 0;
  let prevKey = "";
  return rows.map((r, i) => {
    if (r.thru === 0) return { ...r, rank: 0 };
    const key = `${r.total}:${r.thru}`;
    if (key !== prevKey) {
      rank = i + 1;
      prevKey = key;
    }
    return { ...r, rank };
  });
}

export function isComplete(t: Tournament): boolean {
  return (
    t.players.length > 0 &&
    t.players.every((p) => {
      const arr = t.scores[p.id] ?? [];
      return arr.length === t.holes && arr.every((n) => n > 0);
    })
  );
}
