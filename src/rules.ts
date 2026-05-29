// Stjerneberegning — speiler den originale Stjernejakt-PDF-en.
//
// Et hull regnes "i mål" (holed) bare hvis ballen nådde ringen innen hcp
// slag. Over-par-hull (i mål med flere slag) teller IKKE som hull i mål,
// men slagene teller mot tilleggsregelen.
//
// Stjerne:
//   3 hull i mål → gull
//   2 hull i mål → sølv
//   1 hull i mål → bronse
//   I tillegg: gull hvis totalt antall slag ≤ 3 × hcp (og > 0).

import type { HoleResult, HoleStatus, Round, Star } from "./types";
import { STAR_RANK } from "./types";

export function holeStatus(hole: HoleResult, hcp: number): HoleStatus {
  if (!hole.reached) return "failed";
  return hole.strokes <= hcp ? "holed" : "over_par";
}

export interface RoundResult {
  star: Star;
  holedCount: number;
  totalStrokes: number;
  promoted: boolean;
}

export function evaluateRound(holes: HoleResult[], hcp: number, distance: number): RoundResult {
  const holedCount = holes.filter((h) => holeStatus(h, hcp) === "holed").length;
  const totalStrokes = holes.reduce((sum, h) => sum + (h.strokes || 0), 0);

  let star: Star = "none";
  if (holedCount >= 3) star = "gold";
  else if (holedCount === 2) star = "silver";
  else if (holedCount === 1) star = "bronze";

  const threshold = 3 * hcp;
  if (totalStrokes > 0 && totalStrokes <= threshold) {
    star = maxStar(star, "gold");
  }

  const promoted = star === "gold" && distance === 100;
  return { star, holedCount, totalStrokes, promoted };
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
