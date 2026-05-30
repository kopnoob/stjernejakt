// H4: Milepæl-merker (badges). Avledes rent fra spillerens runder — ingen ny
// lagring trengs. Brukes både i spiller-boardet (rad med opptjente/låste merker)
// og i feiringen (når en runde nettopp låste opp et merke).

import type { Round } from "../types";
import { HCP_RANGE } from "../types";
import { hcpProgress } from "../rules";

export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  /** Hvordan merket låses opp (vises på låste merker). */
  hint: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first-gold", emoji: "🥇", label: "Første gull", hint: "Få din aller første gullstjerne." },
  {
    id: "hcp-complete",
    emoji: "🏅",
    label: "Helt handicap",
    hint: "Gull på alle sju utslag i ett handicap.",
  },
  { id: "ten-gold", emoji: "🌟", label: "10 gull", hint: "Samle 10 gullstjerner til sammen." },
  { id: "hat-trick", emoji: "🔥", label: "Hat trick", hint: "Tre gull på samme dag." },
];

/** Stabil «dag»-nøkkel i lokal tid (grupperer økter på samme dato). */
function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Sett med opptjente merke-id-er for en spillers runder. */
export function earnedBadges(rounds: Round[]): Set<string> {
  const earned = new Set<string>();
  const golds = rounds.filter((r) => r.star === "gold");

  if (golds.length >= 1) earned.add("first-gold");
  if (golds.length >= 10) earned.add("ten-gold");

  for (const h of HCP_RANGE) {
    if (hcpProgress(rounds, h).completed) {
      earned.add("hcp-complete");
      break;
    }
  }

  const byDay = new Map<string, number>();
  for (const r of golds) {
    const n = (byDay.get(dayKey(r.created_at)) ?? 0) + 1;
    byDay.set(dayKey(r.created_at), n);
    if (n >= 3) earned.add("hat-trick");
  }

  return earned;
}

/** Merker som ble låst opp ved overgangen fra `before`-runder til `after`-runder. */
export function newlyUnlocked(before: Round[], after: Round[]): BadgeDef[] {
  const had = earnedBadges(before);
  const has = earnedBadges(after);
  return BADGES.filter((b) => has.has(b.id) && !had.has(b.id));
}
