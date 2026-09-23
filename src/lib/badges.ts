// Merker i Stjernejakt-feiringen. Reglene ligger i achievements.ts
// (golfbagen); dette er et tynt lag i formatet ResultOverlay bruker.

import type { Round, TrainingEntry } from "../types";
import { STEP_NAMES, computeBag, getAchievement, isLadder, newlyEarned, type EarnedItem } from "./achievements";

export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  /** Hva merket betyr. */
  hint: string;
}

const STJERNEJAKT_IDS = ["first-gold", "hcp-complete", "ten-gold", "hat-trick"];

export const BADGES: BadgeDef[] = STJERNEJAKT_IDS.map((id) => {
  const def = getAchievement(id)!;
  return { id, emoji: def.emoji, label: def.name, hint: def.description };
});

function toBadgeDef(item: EarnedItem): BadgeDef {
  const ladder = isLadder(item.def);
  return {
    id: ladder ? `${item.def.id}:${item.step}` : item.def.id,
    emoji: item.def.emoji,
    label: ladder ? `${item.def.name} ${STEP_NAMES[item.step - 1]}` : item.def.name,
    hint: item.def.description,
  };
}

/** Sett med opptjente Stjernejakt-merker for en spillers runder. */
export function earnedBadges(rounds: Round[]): Set<string> {
  const bag = computeBag(rounds, []);
  return new Set(STJERNEJAKT_IDS.filter((id) => bag.badges[id].level > 0));
}

/**
 * Merker som ble låst opp ved overgangen fra `before`- til `after`-runder
 * (inkl. Trofast, Oppdager og Drømmeslag). For stiger vises bare høyeste nye trinn.
 */
export function newlyUnlocked(before: Round[], after: Round[], entries: TrainingEntry[] = []): BadgeDef[] {
  const items = newlyEarned(computeBag(before, entries), computeBag(after, entries));
  const top = new Map<string, EarnedItem>();
  for (const item of items) {
    const cur = top.get(item.def.id);
    if (!cur || item.step > cur.step) top.set(item.def.id, item);
  }
  return [...top.values()].map(toBadgeDef);
}
