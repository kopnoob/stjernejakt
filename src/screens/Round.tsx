import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import ResultOverlay from "../components/ResultOverlay";
import { evaluateRound } from "../rules";
import type { HoleResult, Player } from "../types";
import { DISTANCES, DISTANCE_COLOR, HCP_RANGE, HOLES_PER_ROUND } from "../types";

type Pick = number | "over" | "bom" | null;

interface Props {
  player: Player;
  initialHcp: number;
  initialDistance: number;
  onSave: (hcp: number, distance: number, holes: HoleResult[]) => Promise<void>;
  onBack: () => void;
}

function pickToHole(pick: Exclude<Pick, null>, hcp: number): HoleResult {
  if (pick === "over") return { strokes: hcp + 2, reached: true };
  if (pick === "bom") return { strokes: hcp + 3, reached: false };
  return { strokes: pick, reached: true };
}

export default function Round({ player, initialHcp, initialDistance, onSave, onBack }: Props) {
  const [hcp, setHcp] = useState(initialHcp);
  const [distance, setDistance] = useState(initialDistance);
  const [picks, setPicks] = useState<Pick[]>([null, null, null]);
  const [saved, setSaved] = useState(false);

  // Endrer man oppsett, nullstilles slagene (det er en ny runde-konfig).
  function changeHcp(v: number) {
    setHcp(v);
    setPicks([null, null, null]);
  }
  function changeDistance(v: number) {
    setDistance(v);
    setPicks([null, null, null]);
  }

  function setPick(holeIdx: number, value: Pick) {
    setPicks((prev) => {
      const next = prev.slice();
      next[holeIdx] = next[holeIdx] === value ? null : value; // toggle av ved nytt trykk
      return next;
    });
  }

  const allSet = picks.every((p) => p !== null);
  const mappedHoles: HoleResult[] = useMemo(
    () => picks.filter((p) => p !== null).map((p) => pickToHole(p as Exclude<Pick, null>, hcp)),
    [picks, hcp],
  );

  // Foreløpig resultat (kun for visning). Endelig stjerne krever alle 3.
  const projection = useMemo(() => {
    const holedSoFar = mappedHoles.filter((h) => h.reached && h.strokes <= hcp).length;
    return { holedSoFar, setCount: mappedHoles.length };
  }, [mappedHoles, hcp]);

  const finalResult = useMemo(() => {
    if (!allSet) return null;
    return evaluateRound(mappedHoles, hcp, distance);
  }, [allSet, mappedHoles, hcp, distance]);

  async function handleSave() {
    if (!allSet) return;
    const holes = picks.map((p) => pickToHole(p as Exclude<Pick, null>, hcp));
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
          {projection.setCount}/{HOLES_PER_ROUND}
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
          <HoleCard key={i} index={i} hcp={hcp} pick={picks[i]} onPick={(v) => setPick(i, v)} />
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
                {finalResult.holedCount}/3 i mål · {finalResult.totalStrokes} slag
              </span>
            </div>
          </div>
        ) : (
          <span className="muted save-hint">
            Registrer alle 3 hull ({projection.holedSoFar} i mål så langt)
          </span>
        )}
        <button className="btn btn-primary btn-save" disabled={!allSet} onClick={handleSave}>
          Lagre
        </button>
      </div>

      {saved && finalResult && (
        <ResultOverlay
          result={finalResult}
          hcp={hcp}
          distance={distance}
          onDone={onBack}
        />
      )}
    </div>
  );
}

function HoleCard({
  index,
  hcp,
  pick,
  onPick,
}: {
  index: number;
  hcp: number;
  pick: Pick;
  onPick: (v: Pick) => void;
}) {
  const numbers = Array.from({ length: hcp }, (_, i) => i + 1);
  const status =
    pick === null
      ? null
      : pick === "bom"
      ? { txt: "Ikke i mål", cls: "st-fail" }
      : pick === "over"
      ? { txt: "Over par", cls: "st-over" }
      : { txt: `I mål på ${pick} slag`, cls: "st-holed" };

  return (
    <div className={`hole-card ${pick !== null ? "is-set" : ""}`}>
      <div className="hole-head">
        <span className="hole-name">Hull {index + 1}</span>
        {status && <span className={`hole-status ${status.cls}`}>{status.txt}</span>}
      </div>
      <div className="pick-grid">
        {numbers.map((n) => (
          <button
            key={n}
            className={`pick ${pick === n ? "is-on" : ""}`}
            onClick={() => onPick(n)}
          >
            {n}
          </button>
        ))}
        <button
          className={`pick pick-over ${pick === "over" ? "is-on" : ""}`}
          onClick={() => onPick("over")}
        >
          Over
        </button>
        <button
          className={`pick pick-bom ${pick === "bom" ? "is-on" : ""}`}
          onClick={() => onPick("bom")}
        >
          Bom
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
