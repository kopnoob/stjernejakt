// Stjerneberegning — speiler den originale Stjernejakt-PDF-en.
//
// Et hull regnes "i mål" (holed) bare hvis ballen nådde ringen innen hcp
// slag. Over-par-hull (i mål med flere slag) teller IKKE som hull i mål.
//
// Stjerne:
//   3 hull i mål → gull
//   2 hull i mål → sølv
//   1 hull i mål → bronse
//   I tillegg: gull hvis totalt antall slag ≤ 3 × hcp (og > 0) —
//   MEN bare hvis ingen hull er plukket opp (man må ha fullført alle).

import type { HoleResult, HoleStatus, Round, Star } from "./types";
import { DISTANCES, HCP_RANGE, STAR_RANK } from "./types";

export function holeStatus(hole: HoleResult, hcp: number): HoleStatus {
  if (hole.pickedUp) return "failed";
  return hole.strokes <= hcp ? "holed" : "over_par";
}

export interface RoundResult {
  star: Star;
  holedCount: number;
  totalStrokes: number;
  promoted: boolean;
  /** True hvis minst ett hull ble plukket opp (blokkerer 3×hcp-gull). */
  anyPickedUp: boolean;
  /** True hvis alle 3 hull nådde ringen (ingen plukket opp). */
  allReached: boolean;
  /** Slag-terskelen for gull via totalregelen (3 × hcp). */
  threshold: number;
  /**
   * Hvor nær gull man var via totalregelen, når man ikke fikk gull:
   * antall slag man måtte spart. null hvis gull eller ikke relevant.
   */
  missedGoldBy: number | null;
}

/** Saniterer ett slagtall — ikke-negativt heltall innen rimelig tak. */
function sanitizeStrokes(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(50, Math.floor(n)));
}

export function evaluateRound(holes: HoleResult[], hcp: number, distance: number): RoundResult {
  const holedCount = holes.filter((h) => holeStatus(h, hcp) === "holed").length;
  const totalStrokes = holes.reduce((sum, h) => sum + sanitizeStrokes(h.strokes), 0);
  const anyPickedUp = holes.some((h) => h.pickedUp);
  const allReached = holes.every((h) => !h.pickedUp);

  let star: Star = "none";
  if (holedCount >= 3) star = "gold";
  else if (holedCount === 2) star = "silver";
  else if (holedCount === 1) star = "bronze";

  // Tilleggsregel: gull hvis total ≤ 3×hcp — men kun når alle hull er
  // fullført (ingen plukket opp).
  const threshold = 3 * hcp;
  const goldViaTotal = !anyPickedUp && totalStrokes > 0 && totalStrokes <= threshold;
  if (goldViaTotal) star = maxStar(star, "gold");

  // Hvor nær var man gull via totalregelen? (Kun når det fortsatt var mulig:
  // alle hull fullført, men ikke gull.)
  const missedGoldBy =
    star !== "gold" && allReached && totalStrokes > threshold ? totalStrokes - threshold : null;

  const promoted = star === "gold" && distance === 100;
  return { star, holedCount, totalStrokes, promoted, anyPickedUp, allReached, threshold, missedGoldBy };
}

export function maxStar(a: Star, b: Star): Star {
  return STAR_RANK[a] >= STAR_RANK[b] ? a : b;
}

/** Bygg stjerne-matrise (beste pr hcp×avstand) fra spillerens runder. */
export function buildMatrix(rounds: Round[]) {
  const cells = new Map<string, { best: Star; attempts: number; bestGoldStrokes: number | null }>();
  for (const r of rounds) {
    const key = `${r.hcp}:${r.distance}`;
    const cur = cells.get(key) ?? { best: "none" as Star, attempts: 0, bestGoldStrokes: null };
    cur.attempts += 1;
    cur.best = maxStar(cur.best, r.star);
    if (r.star === "gold") {
      cur.bestGoldStrokes =
        cur.bestGoldStrokes == null ? r.total_strokes : Math.min(cur.bestGoldStrokes, r.total_strokes);
    }
    cells.set(key, cur);
  }
  return cells;
}

/** Totalt antall stjerner samlet (gull=3, sølv=2, bronse=1) på tvers av alle celler. */
export function totalStars(rounds: Round[]): number {
  const cells = buildMatrix(rounds);
  let total = 0;
  for (const c of cells.values()) total += STAR_RANK[c.best];
  return total;
}

// ─── Fremgang i ett handicap (den fokuserte "reisen") ─────────────────────

export interface HcpProgress {
  hcp: number;
  /** Beste stjerne pr utslag for dette hcp-et. */
  bestStarByDistance: Record<number, Star>;
  /** Beste gull-score (færrest slag) pr utslag — personlig rekord. */
  bestGoldStrokesByDistance: Record<number, number | null>;
  /** Antall utslag med gull. */
  goldCount: number;
  /** Stjernepoeng for dette hcp-et (gull=3, sølv=2, bronse=1), maks 21. */
  starPoints: number;
  /** Neste anbefalte utslag (laveste uten gull), eller null hvis alt er gull. */
  nextDistance: number | null;
  /** Alle 7 utslag har gull. */
  completed: boolean;
}

export function hcpProgress(rounds: Round[], hcp: number): HcpProgress {
  const best: Record<number, Star> = {};
  const bestGold: Record<number, number | null> = {};
  for (const d of DISTANCES) {
    best[d] = "none";
    bestGold[d] = null;
  }
  for (const r of rounds) {
    if (r.hcp !== hcp) continue;
    best[r.distance] = maxStar(best[r.distance] ?? "none", r.star);
    if (r.star === "gold") {
      bestGold[r.distance] =
        bestGold[r.distance] == null ? r.total_strokes : Math.min(bestGold[r.distance]!, r.total_strokes);
    }
  }
  const goldCount = DISTANCES.filter((d) => best[d] === "gold").length;
  const starPoints = DISTANCES.reduce((sum, d) => sum + STAR_RANK[best[d]], 0);
  const nextDistance = DISTANCES.find((d) => best[d] !== "gold") ?? null;
  return {
    hcp,
    bestStarByDistance: best,
    bestGoldStrokesByDistance: bestGold,
    goldCount,
    starPoints,
    nextDistance,
    completed: nextDistance === null,
  };
}

/** Neste (lavere/hardere) handicap, eller null hvis allerede på det hardeste. */
export function nextHcpDown(hcp: number): number | null {
  const min = Math.min(...HCP_RANGE);
  return hcp > min ? hcp - 1 : null;
}
