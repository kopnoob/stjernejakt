import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import StarIcon from "../components/StarIcon";
import FlightResultOverlay from "../components/FlightResultOverlay";
import { evaluateRound, type RoundResult } from "../rules";
import type { HoleResult, Player, Round } from "../types";
import { DISTANCES, DISTANCE_COLOR } from "../types";

interface Props {
  players: Player[];
  initialDistance: number;
  getHcp: (playerId: string) => number;
  onSaveAll: (
    entries: { playerId: string; hcp: number; distance: number; holes: HoleResult[] }[],
  ) => Promise<Round[]>;
  onBack: () => void;
}

const MAX_STROKES = 20;
const freshHoles = (): HoleResult[] => [
  { strokes: 0, pickedUp: false },
  { strokes: 0, pickedUp: false },
  { strokes: 0, pickedUp: false },
];

export interface FlightOutcome {
  player: Player;
  hcp: number;
  result: RoundResult;
}

/** Flerspillerscoring: logg hele flighten på samme utslag, lagre alt på én gang. */
export default function FlightRound({ players, initialDistance, getHcp, onSaveAll, onBack }: Props) {
  const [distance, setDistance] = useState(initialDistance);
  // Hcp er fast for flighten (hver spillers nåværende nivå ved oppstart).
  const [hcps] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, getHcp(p.id)])),
  );
  const [holesBy, setHolesBy] = useState<Record<string, HoleResult[]>>(() =>
    Object.fromEntries(players.map((p) => [p.id, freshHoles()])),
  );
  const [saving, setSaving] = useState(false);
  const [outcomes, setOutcomes] = useState<FlightOutcome[] | null>(null);

  function bump(playerId: string, i: number, delta: number) {
    setHolesBy((prev) => {
      const holes = prev[playerId].slice();
      const strokes = Math.max(0, Math.min(MAX_STROKES, holes[i].strokes + delta));
      holes[i] = { strokes, pickedUp: false };
      return { ...prev, [playerId]: holes };
    });
  }
  function togglePickup(playerId: string, i: number) {
    setHolesBy((prev) => {
      const holes = prev[playerId].slice();
      holes[i] = { ...holes[i], pickedUp: !holes[i].pickedUp };
      return { ...prev, [playerId]: holes };
    });
  }

  const isReady = (holes: HoleResult[]) => holes.every((h) => h.pickedUp || h.strokes > 0);
  const readyCount = players.filter((p) => isReady(holesBy[p.id])).length;
  const allReady = readyCount === players.length;

  async function handleSaveAll() {
    if (!allReady || saving) return;
    setSaving(true);
    try {
      const entries = players.map((p) => ({
        playerId: p.id,
        hcp: hcps[p.id],
        distance,
        holes: holesBy[p.id],
      }));
      await onSaveAll(entries);
      setOutcomes(
        players.map((p) => ({
          player: p,
          hcp: hcps[p.id],
          result: evaluateRound(holesBy[p.id], hcps[p.id], distance),
        })),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title">
          <Icon name="flight" size={20} /> Flight · {distance} m
        </span>
        <span className="round-prog tabnum" aria-label="Spillere klare">
          {readyCount}/{players.length}
        </span>
      </header>

      {/* Felles utslag for hele flighten */}
      <section className="setup">
        <div className="setup-group">
          <span className="setup-label">Utslag (m)</span>
          <div className="chip-row">
            {DISTANCES.map((v) => (
              <button
                key={v}
                className={`chip chip-dist ${distance === v ? "is-active" : ""}`}
                onClick={() => setDistance(v)}
              >
                <span className="cone-sm" style={{ background: DISTANCE_COLOR[v] }} />
                {v}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flight-cards">
        {players.map((p) => (
          <PlayerScoreCard
            key={p.id}
            player={p}
            hcp={hcps[p.id]}
            distance={distance}
            holes={holesBy[p.id]}
            onBump={(i, d) => bump(p.id, i, d)}
            onTogglePickup={(i) => togglePickup(p.id, i)}
          />
        ))}
      </div>

      <div className={`save-bar ${allReady ? "is-ready" : ""}`}>
        <span className="muted save-hint">
          {allReady ? "Alle klare!" : `${readyCount}/${players.length} spillere klare`}
        </span>
        <button className="btn btn-primary" disabled={!allReady || saving} onClick={handleSaveAll}>
          {saving ? "Lagrer …" : "Lagre alle"}
        </button>
      </div>

      {outcomes && <FlightResultOverlay outcomes={outcomes} distance={distance} onDone={onBack} />}
    </div>
  );
}

function PlayerScoreCard({
  player,
  hcp,
  distance,
  holes,
  onBump,
  onTogglePickup,
}: {
  player: Player;
  hcp: number;
  distance: number;
  holes: HoleResult[];
  onBump: (i: number, delta: number) => void;
  onTogglePickup: (i: number) => void;
}) {
  const ready = holes.every((h) => h.pickedUp || h.strokes > 0);
  const result = useMemo(
    () => (ready ? evaluateRound(holes, hcp, distance) : null),
    [ready, holes, hcp, distance],
  );

  return (
    <div className={`flight-card ${ready ? "is-ready" : ""}`}>
      <div className="flight-card-head">
        <span className="avatar avatar-sm" style={{ background: player.color }}>
          {player.avatar || player.name.charAt(0).toUpperCase()}
        </span>
        <span className="flight-card-name">
          {player.name}
          <span className="flight-card-hcp muted"> · hcp {hcp}</span>
        </span>
        <span className="flight-card-result">
          {result ? (
            <>
              <StarIcon variant={result.star} size={22} outline={false} />
              <span className="flight-card-star">{starLabel(result.star)}</span>
            </>
          ) : (
            <span className="muted tabnum">
              {holes.filter((h) => h.pickedUp || h.strokes > 0).length}/3
            </span>
          )}
        </span>
      </div>

      <div className="fl-holes">
        {[0, 1, 2].map((i) => (
          <div key={i} className="fl-hole">
            <span className="fl-hole-label muted">Hull {i + 1}</span>
            <div className="fl-stepper">
              <button
                className="fl-step"
                onClick={() => onBump(i, -1)}
                disabled={!holes[i].pickedUp && holes[i].strokes === 0}
                aria-label={`Færre slag, ${player.name} hull ${i + 1}`}
              >
                −
              </button>
              <span className="fl-val tabnum">
                {holes[i].pickedUp ? "✕" : holes[i].strokes || "–"}
              </span>
              <button
                className="fl-step"
                onClick={() => onBump(i, 1)}
                aria-label={`Flere slag, ${player.name} hull ${i + 1}`}
              >
                +
              </button>
            </div>
            <button
              className={`fl-pickup ${holes[i].pickedUp ? "is-on" : ""}`}
              onClick={() => onTogglePickup(i)}
              aria-pressed={holes[i].pickedUp}
            >
              {holes[i].pickedUp ? "✕ Plukket" : "Plukk opp"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function starLabel(star: string): string {
  switch (star) {
    case "gold":
      return "Gull";
    case "silver":
      return "Sølv";
    case "bronze":
      return "Bronse";
    default:
      return "Ingen";
  }
}
