import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import { buildMatrix, totalStars } from "../rules";
import type { Player, Round, Star } from "../types";
import { DISTANCES, DISTANCE_COLOR, HCP_RANGE } from "../types";

interface Props {
  player: Player;
  rounds: Round[];
  onBack: () => void;
  onStart: (hcp: number, distance: number) => void;
  onDelete: () => void;
}

export default function PlayerBoard({ player, rounds, onBack, onStart, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const playerRounds = useMemo(
    () => rounds.filter((r) => r.player_id === player.id),
    [rounds, player.id],
  );
  const matrix = useMemo(() => buildMatrix(playerRounds), [playerRounds]);
  const total = useMemo(() => totalStars(playerRounds), [playerRounds]);

  // Hvilke hcp-kolonner er "fullført" (gull på alle 7 avstander)?
  const completedHcps = useMemo(() => {
    const set = new Set<number>();
    for (const hcp of HCP_RANGE) {
      const allGold = DISTANCES.every((d) => matrix.get(`${hcp}:${d}`)?.best === "gold");
      if (allGold) set.add(hcp);
    }
    return set;
  }, [matrix]);

  const maxStars = HCP_RANGE.length * DISTANCES.length * 3;

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
        <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Innstillinger">
          ⋯
        </button>
      </header>

      <div className="board-stat">
        <div className="board-stat-num tabnum">
          {total}
          <StarIcon variant="gold" size={28} />
        </div>
        <div className="board-stat-prog">
          <div className="progress">
            <div className="progress-fill" style={{ width: `${(total / maxStars) * 100}%` }} />
          </div>
          <span className="muted">{total} av {maxStars} stjerner</span>
        </div>
      </div>

      <p className="board-hint">Trykk på en rute for å starte en runde</p>

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="corner" />
              {HCP_RANGE.map((hcp) => (
                <th key={hcp} className={completedHcps.has(hcp) ? "hcp-done" : ""}>
                  {hcp}
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
                {HCP_RANGE.map((hcp) => {
                  const cell = matrix.get(`${hcp}:${d}`);
                  const best: Star = cell?.best ?? "none";
                  return (
                    <td key={hcp}>
                      <button
                        className={`cell star-${best}`}
                        onClick={() => onStart(hcp, d)}
                        aria-label={`Hcp ${hcp}, ${d} meter${
                          best !== "none" ? `, beste: ${best}` : ""
                        }`}
                      >
                        {best === "none" ? (
                          <span className="cell-dash">·</span>
                        ) : (
                          <StarIcon variant={best} size={20} outline={false} />
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

      <div className="legend">
        <Legend variant="bronze" label="Bronse" />
        <Legend variant="silver" label="Sølv" />
        <Legend variant="gold" label="Gull" />
      </div>

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

function Legend({ variant, label }: { variant: Star; label: string }) {
  return (
    <span className="legend-item">
      <StarIcon variant={variant} size={16} outline={false} />
      {label}
    </span>
  );
}
