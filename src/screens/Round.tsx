import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import ResultOverlay from "../components/ResultOverlay";
import { evaluateRound } from "../rules";
import type { HoleResult, Player } from "../types";
import { DISTANCES, DISTANCE_COLOR, HCP_RANGE, HOLES_PER_ROUND } from "../types";

interface Props {
  player: Player;
  initialHcp: number;
  initialDistance: number;
  onSave: (hcp: number, distance: number, holes: HoleResult[]) => Promise<void>;
  onBack: () => void;
}

const MAX_STROKES = 20;
const freshHoles = (): HoleResult[] => [
  { strokes: 0, reached: true },
  { strokes: 0, reached: true },
  { strokes: 0, reached: true },
];

export default function Round({ player, initialHcp, initialDistance, onSave, onBack }: Props) {
  const [hcp, setHcp] = useState(initialHcp);
  const [distance, setDistance] = useState(initialDistance);
  const [holes, setHoles] = useState<HoleResult[]>(freshHoles);
  const [saved, setSaved] = useState(false);

  // Endrer man oppsett, nullstilles slagene (det er en ny runde-konfig).
  function changeHcp(v: number) {
    setHcp(v);
    setHoles(freshHoles());
  }
  function changeDistance(v: number) {
    setDistance(v);
    setHoles(freshHoles());
  }

  function bumpStrokes(i: number, delta: number) {
    setHoles((prev) => {
      const next = prev.slice();
      const strokes = Math.max(0, Math.min(MAX_STROKES, next[i].strokes + delta));
      next[i] = { ...next[i], strokes };
      return next;
    });
  }
  function toggleReached(i: number) {
    setHoles((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], reached: !next[i].reached };
      return next;
    });
  }

  const setHolesList = holes.filter((h) => h.strokes > 0);
  const allSet = holes.every((h) => h.strokes > 0);

  const totalStrokes = useMemo(
    () => holes.reduce((s, h) => s + h.strokes, 0),
    [holes],
  );
  const holedSoFar = useMemo(
    () => setHolesList.filter((h) => h.reached && h.strokes <= hcp).length,
    [setHolesList, hcp],
  );

  const finalResult = useMemo(() => {
    if (!allSet) return null;
    return evaluateRound(holes, hcp, distance);
  }, [allSet, holes, hcp, distance]);

  const threshold = 3 * hcp;

  async function handleSave() {
    if (!allSet) return;
    setSaved(true);
    await onSave(hcp, distance, holes);
  }

  return (
    <div className="screen round-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          ‹
        </button>
        <span className="topbar-title">
          <span className="dot" style={{ background: player.color }} />
          {player.name}
        </span>
        <span className="round-prog tabnum" aria-label="Hull spilt">
          {setHolesList.length}/{HOLES_PER_ROUND}
        </span>
      </header>

      {/* Oppsett: hcp + utslag */}
      <section className="setup">
        <div className="setup-row">
          <span className="setup-label">Handicap</span>
          <div className="chip-scroll">
            {HCP_RANGE.map((v) => (
              <button
                key={v}
                className={`chip ${hcp === v ? "is-active" : ""}`}
                onClick={() => changeHcp(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
          <span className="setup-label">Utslag</span>
          <div className="chip-scroll">
            {DISTANCES.map((v) => (
              <button
                key={v}
                className={`chip chip-dist ${distance === v ? "is-active" : ""}`}
                onClick={() => changeDistance(v)}
                style={
                  distance === v
                    ? { borderColor: DISTANCE_COLOR[v], background: DISTANCE_COLOR[v], color: "#10231a" }
                    : undefined
                }
              >
                <span className="cone-sm" style={{ background: DISTANCE_COLOR[v] }} />
                {v}m
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tre hull samtidig */}
      <section className="holes">
        {[0, 1, 2].map((i) => (
          <HoleCard
            key={i}
            index={i}
            hcp={hcp}
            hole={holes[i]}
            onBump={(d) => bumpStrokes(i, d)}
            onToggleReached={() => toggleReached(i)}
          />
        ))}
      </section>

      {/* Bunnlinje med resultat + lagre */}
      <div className={`save-bar ${allSet ? "is-ready" : ""}`}>
        {finalResult ? (
          <div className="save-result">
            <StarIcon variant={finalResult.star} size={34} />
            <div className="save-result-text">
              <strong>{starLabel(finalResult.star)}</strong>
              <span className="muted">
                {finalResult.holedCount}/3 i mål · {finalResult.totalStrokes}/{threshold} slag
              </span>
            </div>
          </div>
        ) : (
          <span className="muted save-hint">
            Registrer alle 3 hull · {holedSoFar} i mål · {totalStrokes}/{threshold} slag
          </span>
        )}
        <button className="btn btn-primary btn-save" disabled={!allSet} onClick={handleSave}>
          Lagre
        </button>
      </div>

      {saved && finalResult && (
        <ResultOverlay result={finalResult} hcp={hcp} distance={distance} onDone={onBack} />
      )}
    </div>
  );
}

function HoleCard({
  index,
  hcp,
  hole,
  onBump,
  onToggleReached,
}: {
  index: number;
  hcp: number;
  hole: HoleResult;
  onBump: (delta: number) => void;
  onToggleReached: () => void;
}) {
  const isSet = hole.strokes > 0;
  const status = !isSet
    ? null
    : !hole.reached
    ? { txt: `Ikke i mål · ${hole.strokes} slag`, cls: "st-fail" }
    : hole.strokes <= hcp
    ? { txt: `I mål · ${hole.strokes} slag`, cls: "st-holed" }
    : { txt: `Over par · ${hole.strokes} slag`, cls: "st-over" };

  return (
    <div className={`hole-card ${isSet ? "is-set" : ""}`}>
      <div className="hole-head">
        <span className="hole-name">Hull {index + 1}</span>
        {status && <span className={`hole-status ${status.cls}`}>{status.txt}</span>}
      </div>

      <div className="hole-input">
        <div className="stepper">
          <button
            className="step-btn"
            onClick={() => onBump(-1)}
            disabled={hole.strokes === 0}
            aria-label={`Færre slag på hull ${index + 1}`}
          >
            −
          </button>
          <span className="step-value tabnum">
            <strong>{hole.strokes || "–"}</strong>
            <span className="step-unit">slag</span>
          </span>
          <button
            className="step-btn"
            onClick={() => onBump(1)}
            aria-label={`Flere slag på hull ${index + 1}`}
          >
            +
          </button>
        </div>

        <button
          className={`reach-toggle ${hole.reached ? "is-in" : "is-bom"}`}
          onClick={onToggleReached}
          aria-pressed={!hole.reached}
        >
          {hole.reached ? "✓ I mål" : "✗ Bom"}
        </button>
      </div>
    </div>
  );
}

function starLabel(star: string): string {
  switch (star) {
    case "gold":
      return "Gull!";
    case "silver":
      return "Sølv!";
    case "bronze":
      return "Bronse!";
    default:
      return "Ingen stjerne";
  }
}
