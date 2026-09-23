// Merker («golfbagen»): katalog + utregning.
//
// Alle merker avledes rent fra spillerens runder og treningsregistreringer —
// ingenting lagres som «oppnådd». Angrer man en registrering (myk sletting),
// forsvinner merket den ga av seg selv, og synk mellom enheter blir enkel.
//
// Prinsipper (mestring, ikke oppgaveliste):
//  - Få merker, mange trinn: hvert ferdighetsmerke har 7 trinn i
//    kjeglefargene (grønn → rosa). Merket skifter farge når man blir bedre.
//  - Tilgivelse: 3 treff blant de siste 5 i en serie. Bom nullstiller aldri.
//  - Ett godt slag holder for Rakett. Høyere trinn gir alle lavere.

import type { HoleResult, Round, TrainingEntry, TrainingOutcome } from "../types";
import { DISTANCES } from "../types";

export const STEP_NAMES = ["grønn", "hvit", "gul", "blå", "oransje", "svart", "rosa"];
/** Samme farger som avstandskjeglene (se index.css). */
export const STEP_COLORS = [
  "var(--d10)",
  "var(--d20)",
  "var(--d30)",
  "var(--d40)",
  "var(--d50)",
  "var(--d75)",
  "var(--d100)",
];

export const WINDOW_SIZE = 5;
export const WINDOW_REQUIRED = 3;
/** Stå-på: trinnet tas etter minst så mange forsøk på samme trinn samme dag. */
export const STAA_PAA_MIN = 15;

export type AchievementKind = "value" | "series" | "count" | "moment" | "coach";
export type AchievementArea = "stjernejakt" | "range" | "chipping" | "putting";

export const TRAINING_AREAS: { id: AchievementArea; name: string }[] = [
  { id: "range", name: "Driving range" },
  { id: "chipping", name: "Chipping-green" },
  { id: "putting", name: "Putting-green" },
];

export const COACH_KINDS: { id: NonNullable<TrainingEntry["award"]>; label: string; emoji: string }[] = [
  { id: "innsats", label: "Innsats", emoji: "💪" },
  { id: "lagkamerat", label: "God lagkamerat", emoji: "🤝" },
  { id: "mot", label: "Mot", emoji: "🦁" },
  { id: "fremgang", label: "Fremgang", emoji: "📈" },
];

export interface AchievementStep {
  n: number;
  requirement: string;
  short: string;
  threshold?: number;
  pct?: number;
  distance?: number;
  clubs?: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  kind: AchievementKind;
  area: AchievementArea | null;
  description: string;
  steps: AchievementStep[];
  outcomes?: { code: TrainingOutcome; label: string }[];
  /** Laser: oppgitt slaglengde. Blink: mållengde. Oppgis én gang pr serie. */
  reference?: "length" | "target";
  referencePrompt?: string;
  hidden?: boolean;
}

/** Norsk tallformat: 0.5 → "0,5", 2 → "2". */
export function fmtNum(x: number): string {
  return (Math.round(x * 10) / 10).toString().replace(".", ",");
}

/** Leser «92», «92,5» eller «92.5» (1–500 m). Null for tomt/ugyldig. */
export function parseMeters(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= 500 ? n : null;
}

/** Laser: korridoren sideveis. Blink: treffvinduet rundt mållengden. */
export function referenceHint(
  def: AchievementDef,
  step: AchievementStep,
  referenceM: number | null,
): string | null {
  if (!def.reference || step.pct == null || referenceM == null) return null;
  const margin = (step.pct / 100) * referenceM;
  return def.reference === "length"
    ? `Korridor: ±${fmtNum(margin)} m sideveis`
    : `Treff: ${fmtNum(referenceM - margin)}–${fmtNum(referenceM + margin)} m`;
}

function ladder(items: Omit<AchievementStep, "n">[]): AchievementStep[] {
  return items.map((s, i) => ({ n: i + 1, ...s }));
}

const HIT_MISS = [
  { code: "hit" as const, label: "Innenfor" },
  { code: "miss" as const, label: "Utenfor" },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Driving range ──────────────────────────────────────────────────────
  {
    id: "rakett",
    name: "Rakett",
    emoji: "🚀",
    kind: "value",
    area: "range",
    description: "Lengste slag, total lengde. Ett godt slag holder.",
    steps: ladder(
      [30, 50, 70, 90, 110, 130, 150].map((t) => ({
        requirement: `Slå ${t} m (total lengde)`,
        short: `${t} m`,
        threshold: t,
      })),
    ),
  },
  {
    id: "laser",
    name: "Laser",
    emoji: "🏹",
    kind: "series",
    area: "range",
    description: "Rett fram: hold ballen innenfor korridoren sideveis.",
    steps: ladder(
      [25, 20, 15, 12, 10, 8, 6].map((p) => ({
        requirement: `3 av 5 innenfor ±${p} % sideveis`,
        short: `±${p} %`,
        pct: p,
      })),
    ),
    outcomes: HIT_MISS,
    reference: "length",
    referencePrompt: "Hvor langt slår du (total)?",
  },
  {
    id: "blink",
    name: "Blink",
    emoji: "🎯",
    kind: "series",
    area: "range",
    description: "Lengdekontroll: treff mållengden du velger.",
    steps: ladder(
      [20, 15, 12, 10, 8, 6, 5].map((p) => ({
        requirement: `3 av 5 innenfor ±${p} % av mållengden`,
        short: `±${p} %`,
        pct: p,
      })),
    ),
    outcomes: HIT_MISS,
    reference: "target",
    referencePrompt: "Mållengde (total)",
  },
  // ── Chipping-green ─────────────────────────────────────────────────────
  {
    id: "magnet",
    name: "Magnet",
    emoji: "🧲",
    kind: "series",
    area: "chipping",
    description: "Chip ballen så den stopper nær hullet.",
    steps: ladder(
      (
        [
          [5, 2],
          [10, 2],
          [15, 2],
          [5, 1],
          [10, 1],
          [15, 1],
          [20, 1],
        ] as const
      ).map(([d, n]) => ({
        requirement: `3 av 5 innenfor ${n === 1 ? "én køllelengde" : `${n} køllelengder`} fra ${d} m`,
        short: `${d} m · ${n}×kølle`,
        distance: d,
        clubs: n,
      })),
    ),
    outcomes: [...HIT_MISS, { code: "holed", label: "I hull!" }],
  },
  // ── Putting-green ──────────────────────────────────────────────────────
  {
    id: "plopp",
    name: "Plopp",
    emoji: "⛳",
    kind: "series",
    area: "putting",
    description: "Korte putter i hull.",
    steps: ladder(
      [0.5, 1, 1.5, 2, 2.5, 3, 4].map((d) => ({
        requirement: `3 av 5 i hull fra ${fmtNum(d)} m`,
        short: `${fmtNum(d)} m`,
        distance: d,
      })),
    ),
    outcomes: [
      { code: "hit", label: "I hull" },
      { code: "miss", label: "Bom" },
    ],
  },
  {
    id: "fjaerlett",
    name: "Fjærlett",
    emoji: "🪶",
    kind: "series",
    area: "putting",
    description: "Lange putter som legger seg pent inntil hullet.",
    steps: ladder(
      [3, 5, 7, 9, 11, 13, 15].map((d) => ({
        requirement: `3 av 5 innenfor én putterlengde fra ${d} m`,
        short: `${d} m`,
        distance: d,
      })),
    ),
    outcomes: HIT_MISS,
  },
  // ── På tvers ───────────────────────────────────────────────────────────
  {
    id: "trofast",
    name: "Trofast",
    emoji: "🗓️",
    kind: "count",
    area: null,
    description: "Dager du har spilt eller trent. Teller aldri ned.",
    steps: ladder(
      [3, 5, 10, 15, 20, 30, 50].map((n) => ({
        requirement: `Spill eller tren ${n} dager`,
        short: `${n} dager`,
        threshold: n,
      })),
    ),
  },
  {
    id: "oppdager",
    name: "Oppdager",
    emoji: "🧭",
    kind: "moment",
    area: null,
    description: "Har prøvd Stjernejakt, range, chipping-green og putting-green.",
    steps: [],
  },
  {
    id: "chip-in",
    name: "Chip-in",
    emoji: "🎉",
    kind: "moment",
    area: "chipping",
    description: "Chippet rett i hull.",
    steps: [],
    hidden: true,
  },
  {
    id: "sta-pa",
    name: "Stå-på",
    emoji: "⛰️",
    kind: "moment",
    area: null,
    description: "Klarte et trinn etter mange forsøk samme dag.",
    steps: [],
    hidden: true,
  },
  // ── Stjernejakt ────────────────────────────────────────────────────────
  {
    id: "first-gold",
    name: "Første gull",
    emoji: "🥇",
    kind: "moment",
    area: "stjernejakt",
    description: "Din aller første gullstjerne.",
    steps: [],
  },
  {
    id: "hcp-complete",
    name: "Helt handicap",
    emoji: "🏅",
    kind: "moment",
    area: "stjernejakt",
    description: "Gull på alle sju utslag i ett handicap.",
    steps: [],
  },
  {
    id: "ten-gold",
    name: "10 gull",
    emoji: "🌟",
    kind: "moment",
    area: "stjernejakt",
    description: "10 gullstjerner til sammen.",
    steps: [],
  },
  {
    id: "hat-trick",
    name: "Hat trick",
    emoji: "🔥",
    kind: "moment",
    area: "stjernejakt",
    description: "Tre gull på samme dag.",
    steps: [],
  },
  {
    id: "drommeslag",
    name: "Drømmeslag",
    emoji: "🌠",
    kind: "moment",
    area: "stjernejakt",
    description: "I mål på første slag.",
    steps: [],
    hidden: true,
  },
  // ── Trenerens merke ────────────────────────────────────────────────────
  {
    id: "trener",
    name: "Trenerens merke",
    emoji: "❤️",
    kind: "coach",
    area: null,
    description: "Delt ut av treneren.",
    steps: [],
  },
];

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): AchievementDef | undefined {
  return BY_ID.get(id);
}

export function isLadder(def: AchievementDef): boolean {
  return def.kind === "value" || def.kind === "series" || def.kind === "count";
}

/** Kort tekst for et oppnådd merke: «⛳ Plopp blå», «🧭 Oppdager», «🦁 Trenerens merke: Mot». */
export function earnedLabel(def: AchievementDef, step: number, award?: TrainingEntry | null): string {
  if (def.kind === "coach") {
    const kind = COACH_KINDS.find((k) => k.id === award?.award);
    return kind ? `${kind.emoji} ${def.name}: ${kind.label}` : `${def.emoji} ${def.name}`;
  }
  return isLadder(def) ? `${def.emoji} ${def.name} ${STEP_NAMES[step - 1]}` : `${def.emoji} ${def.name}`;
}

// ─── Regler ─────────────────────────────────────────────────────────────────

function isSuccess(o: TrainingOutcome): boolean {
  return o === "hit" || o === "holed";
}

/** 3 av 5: treff blant de siste fem forsøkene i serien. */
export function seriesWindow(outcomes: TrainingOutcome[]): {
  successes: number;
  count: number;
  passed: boolean;
} {
  const last = outcomes.slice(-WINDOW_SIZE);
  const successes = last.filter(isSuccess).length;
  return { successes, count: last.length, passed: successes >= WINDOW_REQUIRED };
}

/** Beste antall treff i noe vindu av fem påfølgende forsøk. */
function bestWindow(outcomes: TrainingOutcome[]): number {
  if (outcomes.length <= WINDOW_SIZE) return outcomes.filter(isSuccess).length;
  let best = 0;
  for (let i = 0; i + WINDOW_SIZE <= outcomes.length; i++) {
    best = Math.max(best, outcomes.slice(i, i + WINDOW_SIZE).filter(isSuccess).length);
  }
  return best;
}

function stepsReached(def: AchievementDef, value: number): number[] {
  return def.steps.filter((s) => s.threshold != null && value >= s.threshold).map((s) => s.n);
}

/** Stabil dag i lokal tid: «ÅÅÅÅ-MM-DD». */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function byTime<T extends { created_at: string; id: string }>(a: T, b: T): number {
  return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

// ─── Golfbagen ──────────────────────────────────────────────────────────────

export interface EarnedStep {
  step: number;
  at: string;
  value?: number | null;
}

export interface BadgeState {
  id: string;
  /** Stiger: høyeste trinn. Øyeblikk/trener: 1 når oppnådd. */
  level: number;
  earned: EarnedStep[];
  /** Rakett: lengste slag. */
  record?: number | null;
  /** Trofast: antall dager. */
  progress?: number;
  /** Chip-in: antall. Trener: antall merker. */
  count?: number;
  /** Trener: merkene, nyeste først. */
  awards?: TrainingEntry[];
}

export interface GolfbagState {
  badges: Record<string, BadgeState>;
  areasTried: AchievementArea[];
  hiddenFound: number;
  trainingDays: number;
}

function holedInOne(holes: HoleResult[] | undefined): boolean {
  return (holes ?? []).some((h) => !h.pickedUp && h.strokes === 1);
}

/** Regn ut alle merker for én spiller fra rundene og treningsregistreringene. */
export function computeBag(rounds: Round[], entries: TrainingEntry[]): GolfbagState {
  const liveRounds = rounds.filter((r) => !r.deleted).sort(byTime);
  const live = entries.filter((e) => !e.deleted).sort(byTime);
  const attempts = live.filter((e) => e.kind === "attempt");
  const awards = live.filter((e) => e.kind === "coach");

  const badges: Record<string, BadgeState> = {};
  for (const def of ACHIEVEMENTS) badges[def.id] = { id: def.id, level: 0, earned: [] };
  const earn = (id: string, step: number, at: string, value?: number | null) => {
    const s = badges[id];
    if (s.earned.some((e) => e.step === step)) return;
    s.earned.push({ step, at, value });
    s.earned.sort((a, b) => a.step - b.step);
    s.level = Math.max(s.level, step);
  };

  // Stjernejakt (fra rundene, i tidsrekkefølge).
  let golds = 0;
  const goldsByDay = new Map<string, number>();
  const goldDistancesByHcp = new Map<number, Set<number>>();
  for (const r of liveRounds) {
    if (r.star === "gold") {
      golds += 1;
      if (golds === 1) earn("first-gold", 1, r.created_at);
      if (golds === 10) earn("ten-gold", 1, r.created_at);
      const day = localDayKey(r.created_at);
      const n = (goldsByDay.get(day) ?? 0) + 1;
      goldsByDay.set(day, n);
      if (n >= 3) earn("hat-trick", 1, r.created_at);
      const set = goldDistancesByHcp.get(r.hcp) ?? new Set<number>();
      set.add(r.distance);
      goldDistancesByHcp.set(r.hcp, set);
      if (DISTANCES.every((d) => set.has(d))) earn("hcp-complete", 1, r.created_at);
    }
    if (holedInOne(r.holes)) earn("drommeslag", 1, r.created_at);
  }

  // Trening (i tidsrekkefølge, så «oppnådd»-tidspunktet blir riktig).
  const seriesOutcomes = new Map<string, TrainingOutcome[]>();
  const attemptsPerStepDay = new Map<string, number>();
  let chipIns = 0;
  for (const e of attempts) {
    const def = getAchievement(e.badge_id);
    if (!def) continue;
    if (def.kind === "value" && e.value_m != null) {
      for (const step of stepsReached(def, e.value_m)) earn(def.id, step, e.created_at, e.value_m);
      const state = badges[def.id];
      state.record = Math.max(state.record ?? 0, e.value_m);
    } else if (def.kind === "series" && e.outcome && e.step && e.series_id) {
      const key = `${def.id}|${e.step}|${e.series_id}`;
      const outcomes = [...(seriesOutcomes.get(key) ?? []), e.outcome];
      seriesOutcomes.set(key, outcomes);
      const dayKey = `${def.id}|${e.step}|${localDayKey(e.created_at)}`;
      const triesToday = (attemptsPerStepDay.get(dayKey) ?? 0) + 1;
      attemptsPerStepDay.set(dayKey, triesToday);

      const alreadyHad = badges[def.id].earned.some((s) => s.step === e.step);
      if (seriesWindow(outcomes).passed && !alreadyHad) {
        for (let step = 1; step <= e.step; step++) earn(def.id, step, e.created_at, e.reference_m);
        if (triesToday >= STAA_PAA_MIN) earn("sta-pa", 1, e.created_at);
      }
      if (def.id === "magnet" && e.outcome === "holed") {
        chipIns += 1;
        earn("chip-in", 1, e.created_at);
      }
    }
  }
  badges["chip-in"].count = chipIns;

  // Trofast: ulike dager med runder eller trening (ikke trenermerker).
  const activity = [
    ...liveRounds.map((r) => ({ at: r.created_at, area: "stjernejakt" as AchievementArea })),
    ...attempts.map((e) => ({ at: e.created_at, area: getAchievement(e.badge_id)?.area ?? null })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const days = new Set<string>();
  const tried = new Set<AchievementArea>();
  const trofast = getAchievement("trofast")!;
  for (const ev of activity) {
    const day = localDayKey(ev.at);
    if (!days.has(day)) {
      days.add(day);
      for (const step of stepsReached(trofast, days.size)) earn("trofast", step, ev.at, days.size);
    }
    if (ev.area) {
      tried.add(ev.area);
      if (tried.size === 4) earn("oppdager", 1, ev.at);
    }
  }
  badges.trofast.progress = days.size;

  // Trenerens merker.
  const newestFirst = [...awards].reverse();
  badges.trener.awards = newestFirst;
  badges.trener.count = awards.length;
  if (awards.length > 0) {
    badges.trener.level = 1;
    badges.trener.earned = [{ step: 1, at: newestFirst[0].created_at }];
  }

  return {
    badges,
    areasTried: [...tried],
    hiddenFound: ACHIEVEMENTS.filter((d) => d.hidden && badges[d.id].level > 0).length,
    trainingDays: days.size,
  };
}

// ─── Hva er nytt (til feiringen) ────────────────────────────────────────────

export interface EarnedItem {
  def: AchievementDef;
  step: number;
  /** Trenermerket som ble gitt (bare for «trener»). */
  award?: TrainingEntry;
}

export function newlyEarned(before: GolfbagState, after: GolfbagState): EarnedItem[] {
  const out: EarnedItem[] = [];
  for (const def of ACHIEVEMENTS) {
    const was = before.badges[def.id];
    const now = after.badges[def.id];
    if (def.kind === "coach") {
      const had = new Set((was.awards ?? []).map((a) => a.id));
      for (const award of now.awards ?? []) if (!had.has(award.id)) out.push({ def, step: 1, award });
      continue;
    }
    const had = new Set(was.earned.map((e) => e.step));
    for (const e of now.earned) if (!had.has(e.step)) out.push({ def, step: e.step });
  }
  return out;
}

// ─── «Nesten» (i dag) ───────────────────────────────────────────────────────

export interface NearMiss {
  badgeId: string;
  step: number;
  best: number;
}

/** Serietrinn fra en dag som manglet ett treff (beste vindu = 2 av 5). */
export function nearMisses(entries: TrainingEntry[], bag: GolfbagState, dayKey: string): NearMiss[] {
  const series = new Map<string, { badgeId: string; step: number; outcomes: TrainingOutcome[] }>();
  for (const e of [...entries].sort(byTime)) {
    if (e.deleted || e.kind !== "attempt" || !e.outcome || !e.step || !e.series_id) continue;
    if (localDayKey(e.created_at) !== dayKey) continue;
    const key = `${e.badge_id}|${e.step}|${e.series_id}`;
    const cur = series.get(key) ?? { badgeId: e.badge_id, step: e.step, outcomes: [] };
    cur.outcomes.push(e.outcome);
    series.set(key, cur);
  }
  const best = new Map<string, NearMiss>();
  for (const s of series.values()) {
    const key = `${s.badgeId}|${s.step}`;
    const n = bestWindow(s.outcomes);
    if (n > (best.get(key)?.best ?? -1)) best.set(key, { badgeId: s.badgeId, step: s.step, best: n });
  }
  const order = ACHIEVEMENTS.map((a) => a.id);
  return [...best.values()]
    .filter(
      (m) =>
        m.best >= WINDOW_REQUIRED - 1 &&
        !(bag.badges[m.badgeId]?.earned ?? []).some((e) => e.step === m.step),
    )
    .sort((a, b) => b.best - a.best || order.indexOf(a.badgeId) - order.indexOf(b.badgeId) || a.step - b.step);
}
