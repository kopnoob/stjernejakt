// Domenetyper for Stjernejakt Mobil.

export type Star = "none" | "bronze" | "silver" | "gold";

// holed   = i mål innen hcp slag (teller mot stjerne)
// over_par= i mål, men brukte flere slag enn hcp (slag teller, hull teller ikke)
// failed  = kom ikke i mål
export type HoleStatus = "holed" | "over_par" | "failed";

export interface HoleResult {
  /** Antall slag brukt på hullet (beholdes selv om man plukker opp). */
  strokes: number;
  /**
   * Plukket opp (ga seg uten å fullføre hullet). Vises som «✕».
   * Et plukket-opp hull teller ikke som i mål, OG hindrer gull via
   * 3×hcp-regelen (man fullførte ikke alle hull).
   */
  pickedUp: boolean;
}

export interface Player {
  id: string;
  name: string;
  /** Hex-farge for avatar/identitet. */
  color: string;
  created_at: string;
}

export interface Round {
  id: string;
  player_id: string;
  hcp: number;
  distance: number;
  star: Star;
  holed_count: number;
  total_strokes: number;
  holes: HoleResult[];
  created_at: string;
}

/** Én celle i stjerne-matrisen (hcp × avstand). */
export interface MatrixCell {
  hcp: number;
  distance: number;
  best_star: Star;
  attempts: number;
  best_total_strokes: number | null;
}

export const DISTANCES = [10, 20, 30, 40, 50, 75, 100];
export const HCP_RANGE = [2, 3, 4, 5, 6, 7, 8];
export const DEFAULT_HCP = 5;
export const HOLES_PER_ROUND = 3;

export const STAR_RANK: Record<Star, number> = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

/** PDF-kjeglefarger per avstand. */
export const DISTANCE_COLOR: Record<number, string> = {
  10: "var(--d10)",
  20: "var(--d20)",
  30: "var(--d30)",
  40: "var(--d40)",
  50: "var(--d50)",
  75: "var(--d75)",
  100: "var(--d100)",
};

/** Forhåndsvalgte avatar-farger for nye spillere. */
export const PLAYER_COLORS = [
  "#1f6b43", // grønn
  "#3f7fb0", // blå
  "#d9744f", // terrakotta
  "#d65a9a", // rosa
  "#7a5cc0", // lilla
  "#e0a52e", // gul
];
