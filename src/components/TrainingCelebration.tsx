import { useEffect, useRef, useState } from "react";
import BadgePin, { type PinVariant } from "./BadgePin";
import Confetti from "./Confetti";
import { playCelebration } from "../lib/sound";
import { haptic } from "../lib/haptics";
import {
  COACH_KINDS,
  STEP_COLORS,
  STEP_NAMES,
  earnedLabel,
  fmtNum,
  isLadder,
  type EarnedItem,
} from "../lib/achievements";
import type { Player } from "../types";

interface Props {
  player: Player;
  items: EarnedItem[];
  /** Ny lengde-rekord (Rakett), vises som tillegg. */
  record: number | null;
  onDone: () => void;
}

interface View {
  emoji: string;
  variant: PinVariant;
  level: number;
  title: string;
  sub: string | null;
  jump: string | null;
  extras: string[];
  next: string | null;
  big: boolean;
  colors: string[];
}

/**
 * Feiringen i øyeblikket: merket i ny farge, lyd og konfetti. Øvelsens trinn
 * er hovedsaken; Trofast, hemmelige merker og rekord vises som små tillegg.
 */
export default function TrainingCelebration({ player, items, record, onDone }: Props) {
  const [show, setShow] = useState(false);
  const [view] = useState(() => describe(items, record));
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    // Fokus på kortet (ikke «Fortsett»): ellers kan Enter-tasten som lagret
    // lengden også «trykke» Fortsett og lukke feiringen med en gang.
    cardRef.current?.focus();
    if (view) {
      playCelebration(view.big ? "gold" : view.variant === "ladder" ? "silver" : "bronze");
      haptic([18, 40, 18]);
    }
    return () => cancelAnimationFrame(id);
  }, [view]);

  if (!view) return null;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="feiring-tittel">
      <Confetti colors={view.colors} count={view.big ? 40 : 28} />
      <div ref={cardRef} tabIndex={-1} className={`result-card ${show ? "is-in" : ""}`}>
        <p className="celebrate-player">
          <span className="avatar-mini" style={{ background: player.color }}>
            {player.avatar || player.name.charAt(0).toUpperCase()}
          </span>
          {player.name}
        </p>
        <div className="result-star">
          <BadgePin emoji={view.emoji} variant={view.variant} level={view.level} size={128} label={view.title} pop />
        </div>
        <h2 id="feiring-tittel" className="result-title celebrate-title">
          {view.title}
        </h2>
        {view.sub && <p className="result-sub muted">{view.sub}</p>}
        {view.jump && <p className="result-record">{view.jump}</p>}
        {view.extras.length > 0 && (
          <div className="result-badges">
            {view.extras.map((e) => (
              <p key={e} className="result-badge">
                {e}
              </p>
            ))}
          </div>
        )}
        {view.next && <p className="celebrate-next muted">{view.next}</p>}
        <button className="btn btn-primary btn-done" onClick={onDone}>
          Fortsett
        </button>
      </div>
    </div>
  );
}

function describe(items: EarnedItem[], record: number | null): View | null {
  const exercise = items.filter((i) => isLadder(i.def) && i.def.id !== "trofast");
  const trofast = items.filter((i) => i.def.id === "trofast");
  const coach = items.filter((i) => i.def.kind === "coach");
  const moments = items.filter((i) => i.def.kind === "moment");
  const top = (list: EarnedItem[]) => list.reduce((a, b) => (b.step > a.step ? b : a));

  let main: Omit<View, "extras"> | null = null;
  let restMoments = moments;
  const extras: string[] = [];

  const ladder = exercise.length > 0 ? exercise : trofast;
  if (ladder.length > 0) {
    const t = top(ladder);
    const jumped = ladder.filter((i) => i.def.id === t.def.id).length;
    const next = t.def.steps[t.step] ?? null;
    main = {
      emoji: t.def.emoji,
      variant: "ladder",
      level: t.step,
      title: `${t.def.name} — ${STEP_NAMES[t.step - 1]}!`,
      sub: t.def.steps[t.step - 1]?.requirement ?? null,
      jump: jumped > 1 ? `⏫ ${jumped} trinn på én gang!` : null,
      next: next
        ? `Neste: ${STEP_NAMES[next.n - 1]} · ${next.requirement}`
        : "Alle 7 trinn — hele stigen er din! 🏆",
      big: t.step === 7 || jumped >= 3,
      colors: [STEP_COLORS[t.step - 1], "#efb014", "#fff", "#43a463"],
    };
    if (exercise.length > 0 && trofast.length > 0) extras.push(earnedLabel(top(trofast).def, top(trofast).step));
  } else if (coach.length > 0) {
    const c = coach[0];
    const kind = COACH_KINDS.find((k) => k.id === c.award?.award);
    main = {
      emoji: kind?.emoji ?? c.def.emoji,
      variant: "coach",
      level: 0,
      title: `Trenerens merke: ${kind?.label ?? ""}`,
      sub: c.award?.note ? `«${c.award.note}»` : null,
      jump: null,
      next: null,
      big: false,
      colors: ["#d65a9a", "#efb014", "#fff", "#7a5cc0"],
    };
  } else if (moments.length > 0) {
    const m = moments[0];
    restMoments = moments.slice(1);
    main = {
      emoji: m.def.emoji,
      variant: "moment",
      level: 0,
      title: m.def.hidden ? `Hemmelig merke: ${m.def.name}!` : `${m.def.name}!`,
      sub: m.def.description,
      jump: null,
      next: null,
      big: false,
      colors: ["#efb014", "#fbe7a6", "#fff", "#e08b2e"],
    };
  }
  if (!main) return null;

  for (const m of restMoments) extras.push(`${m.def.hidden ? "✨ Hemmelig: " : ""}${earnedLabel(m.def, 1)}`);
  if (record != null) extras.push(`🚀 Ny rekord: ${fmtNum(record)} m`);
  return { ...main, extras };
}
