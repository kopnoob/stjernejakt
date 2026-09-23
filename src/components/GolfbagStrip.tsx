import BadgePin from "./BadgePin";
import { ACHIEVEMENTS, COACH_KINDS, STEP_NAMES, isLadder, type GolfbagState } from "../lib/achievements";

interface Props {
  bag: GolfbagState;
  onOpen: () => void;
}

const MAX_PINS = 6;

/** Kompakt stripe på spillerkortet: de nyeste merkene + snarvei til golfbagen. */
export default function GolfbagStrip({ bag, onOpen }: Props) {
  const recent = ACHIEVEMENTS.flatMap((def) => {
    const s = bag.badges[def.id];
    if (!s || s.level === 0 || s.earned.length === 0) return [];
    const at = s.earned.reduce((a, b) => (b.at > a ? b.at : a), s.earned[0].at);
    const kind = def.kind === "coach" ? COACH_KINDS.find((k) => k.id === s.awards?.[0]?.award) : undefined;
    return [
      {
        def,
        at,
        level: s.level,
        emoji: kind?.emoji ?? def.emoji,
        variant: isLadder(def) ? ("ladder" as const) : def.kind === "coach" ? ("coach" as const) : ("moment" as const),
        label: isLadder(def) ? `${def.name} ${STEP_NAMES[s.level - 1]}` : def.name,
      },
    ];
  })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_PINS);

  return (
    <button className="bag-strip" onClick={onOpen} aria-label="Åpne golfbagen">
      {recent.length === 0 ? (
        <span className="bag-strip-empty muted">🎒 Golfbagen er tom ennå — spill eller tren for å samle merker</span>
      ) : (
        <span className="bag-strip-pins">
          {recent.map((r) => (
            <BadgePin
              key={r.def.id}
              emoji={r.emoji}
              variant={r.variant}
              level={r.level}
              size={38}
              label={r.label}
            />
          ))}
        </span>
      )}
      <span className="bag-strip-go">Golfbagen ›</span>
    </button>
  );
}
