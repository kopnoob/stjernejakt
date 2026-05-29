import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import { buildMatrix, hcpProgress, nextHcpDown } from "../rules";
import type { Player, Round, Star } from "../types";
import { DISTANCES, DISTANCE_COLOR, HCP_RANGE } from "../types";

interface Props {
  player: Player;
  rounds: Round[];
  onBack: () => void;
  onStart: (hcp: number, distance: number) => void;
  onSetHcp: (hcp: number) => void;
  onDelete: () => void;
}

type Mode = "journey" | "overview";

export default function PlayerBoard({ player, rounds, onBack, onStart, onSetHcp, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>("journey");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switchHcp, setSwitchHcp] = useState(false);

  const playerRounds = useMemo(
    () => rounds.filter((r) => r.player_id === player.id),
    [rounds, player.id],
  );

  const hcp = player.current_hcp;
  const prog = useMemo(() => hcpProgress(playerRounds, hcp), [playerRounds, hcp]);
  const downHcp = nextHcpDown(hcp);

  // Hvilke hcp er ferdig (alle 7 gull) — vises i hcp-velgeren.
  const completedHcps = useMemo(() => {
    const set = new Set<number>();
    for (const h of HCP_RANGE) if (hcpProgress(playerRounds, h).completed) set.add(h);
    return set;
  }, [playerRounds]);

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          ‹
        </button>
        <span className="topbar-title">
          <span className="dot" style={{ background: player.color }} />
          {player.name}
        </span>
        <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Mer">
          ⋯
        </button>
      </header>

      {/* Hcp-fokus-kort */}
      <div className="hcp-card">
        <div className="hcp-card-top">
          <div className="hcp-badge">
            <span className="hcp-badge-label">Handicap</span>
            <span className="hcp-badge-num">{hcp}</span>
          </div>
          <div className="hcp-card-prog">
            <div className="hcp-prog-line">
              <strong className="tabnum">{prog.goldCount}/7</strong> gull
              <button className="hcp-switch-btn" onClick={() => setSwitchHcp((v) => !v)}>
                Bytt {switchHcp ? "▴" : "▾"}
              </button>
            </div>
            <div className="progress">
              <div className="progress-fill gold" style={{ width: `${(prog.goldCount / 7) * 100}%` }} />
            </div>
          </div>
        </div>

        {switchHcp && (
          <div className="hcp-switch-row">
            {HCP_RANGE.map((h) => (
              <button
                key={h}
                className={`chip ${h === hcp ? "is-active" : ""} ${completedHcps.has(h) ? "is-done" : ""}`}
                onClick={() => {
                  onSetHcp(h);
                  setSwitchHcp(false);
                }}
              >
                {h}
                {completedHcps.has(h) && <span className="chip-done-dot">★</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reise / oversikt */}
      <div className="mode-toggle">
        <button className={mode === "journey" ? "is-on" : ""} onClick={() => setMode("journey")}>
          Reise
        </button>
        <button className={mode === "overview" ? "is-on" : ""} onClick={() => setMode("overview")}>
          Oversikt
        </button>
      </div>

      {mode === "journey" ? (
        <Journey
          hcp={hcp}
          prog={prog}
          downHcp={downHcp}
          onStart={(d) => onStart(hcp, d)}
          onGoDown={() => downHcp && onSetHcp(downHcp)}
        />
      ) : (
        <OverviewGrid playerRounds={playerRounds} currentHcp={hcp} onStart={onStart} />
      )}

      {confirmDelete && (
        <div className="sheet-backdrop" onClick={() => setConfirmDelete(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-title">Slette {player.name}?</p>
            <p className="muted">Alle runder og stjerner forsvinner. Dette kan ikke angres.</p>
            <div className="add-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Avbryt
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
              >
                Slett
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reise: de 7 utslagene som en sti ─────────────────────────────────────

function Journey({
  hcp,
  prog,
  downHcp,
  onStart,
  onGoDown,
}: {
  hcp: number;
  prog: ReturnType<typeof hcpProgress>;
  downHcp: number | null;
  onStart: (distance: number) => void;
  onGoDown: () => void;
}) {
  return (
    <>
      {prog.completed && (
        <div className="complete-banner">
          <div className="complete-emoji">🎉</div>
          <div className="complete-text">
            <strong>Handicap {hcp} fullført!</strong>
            <span className="muted">Gull på alle utslag.</span>
          </div>
          {downHcp ? (
            <button className="btn btn-primary" onClick={onGoDown}>
              Gå videre til handicap {downHcp} →
            </button>
          ) : (
            <p className="muted" style={{ textAlign: "center" }}>
              🏆 Du har fullført det hardeste handicapet!
            </p>
          )}
        </div>
      )}

      <div className="journey">
        {DISTANCES.map((d) => {
          const star: Star = prog.bestStarByDistance[d] ?? "none";
          const isNext = d === prog.nextDistance;
          const isFuture = prog.nextDistance !== null && d > prog.nextDistance && star === "none";
          return (
            <button
              key={d}
              className={`step ${isNext ? "is-next" : ""} ${star === "gold" ? "is-gold" : ""} ${
                isFuture ? "is-future" : ""
              }`}
              onClick={() => onStart(d)}
            >
              <span className="step-cone" style={{ background: DISTANCE_COLOR[d] }} />
              <span className="step-dist">{d} m</span>
              <span className="step-mid">
                {isNext && <span className="next-tag">Neste</span>}
                {isNext && star !== "none" && <StarIcon variant={star} size={18} outline={false} />}
                {!isNext && <span className="step-star-label muted">{starLabel(star)}</span>}
              </span>
              <span className="step-right">
                {isNext ? (
                  <span className="step-play">Spill ▶</span>
                ) : star !== "none" ? (
                  <StarIcon variant={star} size={26} outline={false} />
                ) : (
                  <span className="cell-dash">·</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Oversikt: full matrise (sekundær) ─────────────────────────────────────

function OverviewGrid({
  playerRounds,
  currentHcp,
  onStart,
}: {
  playerRounds: Round[];
  currentHcp: number;
  onStart: (hcp: number, distance: number) => void;
}) {
  const matrix = useMemo(() => buildMatrix(playerRounds), [playerRounds]);
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner" />
            {HCP_RANGE.map((h) => (
              <th key={h} className={h === currentHcp ? "hcp-current" : ""}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DISTANCES.map((d) => (
            <tr key={d}>
              <th className="dist-label">
                <span className="cone" style={{ background: DISTANCE_COLOR[d] }} />
                {d}
              </th>
              {HCP_RANGE.map((h) => {
                const best: Star = matrix.get(`${h}:${d}`)?.best ?? "none";
                return (
                  <td key={h}>
                    <button
                      className={`cell star-${best}`}
                      onClick={() => onStart(h, d)}
                      aria-label={`Hcp ${h}, ${d} meter${best !== "none" ? `, beste: ${best}` : ""}`}
                    >
                      {best === "none" ? (
                        <span className="cell-dash">·</span>
                      ) : (
                        <StarIcon variant={best} size={18} outline={false} />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function starLabel(star: Star): string {
  switch (star) {
    case "gold":
      return "Gull";
    case "silver":
      return "Sølv";
    case "bronze":
      return "Bronse";
    default:
      return "Ikke spilt";
  }
}
