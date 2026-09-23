import { useState } from "react";
import BadgePin, { type PinVariant } from "./BadgePin";
import Icon from "./Icon";
import {
  ACHIEVEMENTS,
  COACH_KINDS,
  STEP_NAMES,
  TRAINING_AREAS,
  earnedLabel,
  fmtNum,
  getAchievement,
  isLadder,
  localDayKey,
  nearMisses,
  type AchievementDef,
  type GolfbagState,
} from "../lib/achievements";
import type { TrainingEntry } from "../types";

interface Props {
  bag: GolfbagState;
  /** Spillerens treningsregistreringer (for «nesten» i dag). */
  entries: TrainingEntry[];
  onOpen: (achievementId: string) => void;
  onTrain: () => void;
}

interface Pin {
  def: AchievementDef;
  emoji: string;
  variant: PinVariant;
  level: number;
  count?: number;
  sub: string;
  label: string;
}

/**
 * Spillerens samling. Viser bare det som er oppnådd — et treningsområde man
 * ikke har prøvd er ett «?», og hemmelige merker telles men listes aldri.
 */
export default function Golfbag({ bag, entries, onOpen, onTrain }: Props) {
  const [today] = useState(() => localDayKey(new Date().toISOString()));
  const pins = buildPins(bag);
  const untried = TRAINING_AREAS.filter((a) => !bag.areasTried.includes(a.id));
  const todayLabels = earnedOn(bag, today);
  const near = nearMisses(entries, bag, today);

  return (
    <section className="golfbag" aria-labelledby="golfbag-title">
      <div className="golfbag-head">
        <h2 id="golfbag-title" className="golfbag-title">
          Golfbagen
        </h2>
        {bag.hiddenFound > 0 ? (
          <span className="golfbag-secret">
            ✨ {bag.hiddenFound} hemmelig{bag.hiddenFound > 1 ? "e" : ""} funnet
          </span>
        ) : pins.length > 0 ? (
          <span className="golfbag-secret muted">Psst … det finnes hemmelige merker</span>
        ) : null}
      </div>

      {pins.length === 0 && (
        <p className="golfbag-empty muted">Tom ennå. Spill en runde eller tren, så begynner samlingen.</p>
      )}

      <div className="golfbag-grid">
        {pins.map((p) => (
          <button key={p.def.id} className="golfbag-pin" onClick={() => onOpen(p.def.id)}>
            <BadgePin emoji={p.emoji} variant={p.variant} level={p.level} count={p.count} size={58} label={p.label} />
            <span className="golfbag-name">{p.def.name}</span>
            <span className="golfbag-sub">{p.sub}</span>
          </button>
        ))}
        {untried.map((a) => (
          <button key={a.id} className="golfbag-pin is-mystery" onClick={onTrain}>
            <BadgePin emoji="?" variant="mystery" size={58} label={`${a.name}: ikke prøvd ennå`} />
            <span className="golfbag-name">{a.name}</span>
            <span className="golfbag-sub">Venter på deg</span>
          </button>
        ))}
      </div>

      {(todayLabels.length > 0 || near.length > 0) && (
        <div className="golfbag-today">
          <span className="golfbag-today-label">I dag</span>
          <ul className="golfbag-today-list">
            {todayLabels.map((t) => (
              <li key={t} className="today-chip is-earned">
                {t}
              </li>
            ))}
            {near.map((n) => {
              const def = getAchievement(n.badgeId);
              return (
                <li key={`${n.badgeId}-${n.step}`} className="today-chip">
                  Nesten: {def?.name} {STEP_NAMES[n.step - 1]} ({n.best} av 5)
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button className="btn btn-flight golfbag-train" onClick={onTrain}>
        <Icon name="target" size={20} />
        Tren på range, chipping eller putting
      </button>
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildPins(bag: GolfbagState): Pin[] {
  const pins: Pin[] = [];
  for (const def of ACHIEVEMENTS) {
    const s = bag.badges[def.id];
    if (!s || s.level === 0) continue;
    if (isLadder(def)) {
      const stepName = STEP_NAMES[s.level - 1];
      const detail =
        def.kind === "value" && s.record != null
          ? `${fmtNum(s.record)} m`
          : def.kind === "count"
            ? `${s.progress ?? 0} dager`
            : (def.steps[s.level - 1]?.short ?? "");
      pins.push({
        def,
        emoji: def.emoji,
        variant: "ladder",
        level: s.level,
        sub: `${capitalize(stepName)} · ${detail}`,
        label: `${def.name}, trinn ${s.level} av 7 (${stepName})`,
      });
    } else if (def.kind === "coach") {
      const kind = COACH_KINDS.find((k) => k.id === s.awards?.[0]?.award);
      pins.push({
        def,
        emoji: kind?.emoji ?? def.emoji,
        variant: "coach",
        level: 0,
        count: s.count,
        sub: kind?.label ?? "",
        label: `${def.name}, ${s.count ?? 0} stk`,
      });
    } else {
      const times = s.count ?? 0;
      pins.push({
        def,
        emoji: def.emoji,
        variant: "moment",
        level: 0,
        sub: def.id === "chip-in" && times > 1 ? `${times} ganger` : def.hidden ? "Hemmelig merke" : "Oppnådd",
        label: `${def.name}, oppnådd`,
      });
    }
  }
  return pins;
}

/** Merker oppnådd en gitt dag — høyeste trinn pr merke, pluss trenermerker. */
function earnedOn(bag: GolfbagState, day: string): string[] {
  const out: string[] = [];
  for (const def of ACHIEVEMENTS) {
    const s = bag.badges[def.id];
    if (def.kind === "coach") {
      for (const a of s.awards ?? []) if (localDayKey(a.created_at) === day) out.push(earnedLabel(def, 1, a));
      continue;
    }
    const steps = s.earned.filter((e) => localDayKey(e.at) === day).map((e) => e.step);
    if (steps.length) out.push(earnedLabel(def, Math.max(...steps)));
  }
  return out;
}
