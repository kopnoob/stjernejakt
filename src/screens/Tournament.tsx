import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import TournamentResult from "../components/TournamentResult";
import {
  deleteTournament,
  getTournament,
  isComplete,
  saveTournament,
  standings,
  type Tournament as T,
} from "../lib/tournaments";

interface Props {
  id: string;
  onBack: () => void;
}

const MAX_STROKES = 15;
type Tab = "spill" | "scorekort";

export default function Tournament({ id, onBack }: Props) {
  const [t, setT] = useState<T | null>(() => getTournament(id));
  const [hole, setHole] = useState(() => firstOpenHole(getTournament(id)));
  const [tab, setTab] = useState<Tab>("spill");
  const [showResult, setShowResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const board = useMemo(() => (t ? standings(t) : []), [t]);

  if (!t) {
    return (
      <div className="screen">
        <header className="topbar">
          <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
            <Icon name="back" size={22} />
          </button>
          <span className="topbar-title">Turnering</span>
          <span style={{ width: 44 }} />
        </header>
        <div className="empty">
          <p>Fant ikke turneringen.</p>
        </div>
      </div>
    );
  }

  function update(mutate: (draft: T) => void) {
    setT((prev) => {
      if (!prev) return prev;
      const next: T = JSON.parse(JSON.stringify(prev));
      mutate(next);
      saveTournament(next);
      return next;
    });
  }

  function bump(playerId: string, delta: number) {
    update((d) => {
      const arr = d.scores[playerId] ?? (d.scores[playerId] = Array(d.holes).fill(0));
      arr[hole] = Math.max(0, Math.min(MAX_STROKES, (arr[hole] || 0) + delta));
    });
  }

  const complete = isComplete(t);
  const isLast = hole >= t.holes - 1;

  function finish() {
    update((d) => {
      d.done = true;
    });
    setShowResult(true);
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title topbar-title-stack">
          <span className="topbar-name">
            <Icon name="trophy" size={18} /> {t.name}
          </span>
          <span className="topbar-hcp">{t.holes} hull</span>
        </span>
        <button className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label="Mer">
          <Icon name="more" size={22} />
        </button>
      </header>

      {/* Ledertavle */}
      <div className="leaderboard">
        <div className="leaderboard-head">
          <span>Ledertavle</span>
          <button className="hcp-switch-btn" onClick={() => setShowResult(true)}>
            Resultat
          </button>
        </div>
        {board.map((s) => (
          <div key={s.player.id} className={`lb-row ${s.rank === 1 && s.thru > 0 ? "is-leader" : ""}`}>
            <span className="lb-rank">{rankLabel(s.rank)}</span>
            <span className="avatar avatar-sm" style={{ background: s.player.color }}>
              {s.player.avatar || s.player.name.charAt(0).toUpperCase()}
            </span>
            <span className="lb-name">{s.player.name}</span>
            <span className="lb-thru muted tabnum">{s.thru > 0 ? `${s.thru}/${t.holes}` : "–"}</span>
            <span className="lb-total tabnum">{s.thru > 0 ? s.total : "–"}</span>
          </div>
        ))}
      </div>

      <div className="mode-toggle">
        <button className={tab === "spill" ? "is-on" : ""} onClick={() => setTab("spill")}>
          Spill
        </button>
        <button className={tab === "scorekort" ? "is-on" : ""} onClick={() => setTab("scorekort")}>
          Scorekort
        </button>
      </div>

      {tab === "spill" ? (
        <>
          <div className="hole-nav">
            <button
              className="icon-btn"
              onClick={() => setHole((h) => Math.max(0, h - 1))}
              disabled={hole <= 0}
              aria-label="Forrige hull"
            >
              <Icon name="back" size={20} />
            </button>
            <span className="hole-nav-label">
              Hull <strong className="tabnum">{hole + 1}</strong> / {t.holes}
            </span>
            <button
              className="icon-btn hole-nav-next"
              onClick={() => setHole((h) => Math.min(t.holes - 1, h + 1))}
              disabled={isLast}
              aria-label="Neste hull"
            >
              <Icon name="back" size={20} />
            </button>
          </div>

          <div className="flight-cards">
            {t.players.map((p) => {
              const val = t.scores[p.id]?.[hole] ?? 0;
              return (
                <div key={p.id} className="tour-score-row">
                  <span className="avatar avatar-sm" style={{ background: p.color }}>
                    {p.avatar || p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="tour-score-name">{p.name}</span>
                  <div className="fl-stepper tour-stepper">
                    <button
                      className="fl-step"
                      onClick={() => bump(p.id, -1)}
                      disabled={val === 0}
                      aria-label={`Færre slag, ${p.name}`}
                    >
                      −
                    </button>
                    <span className="fl-val tabnum">{val || "–"}</span>
                    <button
                      className="fl-step"
                      onClick={() => bump(p.id, 1)}
                      aria-label={`Flere slag, ${p.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="save-bar is-ready">
            <span className="muted save-hint">
              {complete ? "Alle hull ført!" : `Hull ${hole + 1} av ${t.holes}`}
            </span>
            {isLast ? (
              <button className="btn btn-primary" onClick={finish}>
                Se resultat
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setHole((h) => h + 1)}>
                Neste hull →
              </button>
            )}
          </div>
        </>
      ) : (
        <Scorecard t={t} onPick={(h) => { setHole(h); setTab("spill"); }} />
      )}

      {showResult && (
        <TournamentResult
          tournament={t}
          standings={board}
          onDone={() => setShowResult(false)}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} labelledBy="t-del-title">
          <p className="sheet-title" id="t-del-title">
            Slette «{t.name}»?
          </p>
          <p className="muted">Scorekortet forsvinner fra denne enheten.</p>
          <div className="add-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
              Avbryt
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                deleteTournament(t.id);
                onBack();
              }}
            >
              Slett
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Scorecard({ t, onPick }: { t: T; onPick: (hole: number) => void }) {
  const holeArr = Array.from({ length: t.holes }, (_, i) => i);
  return (
    <div className="scorecard-wrap">
      <table className="scorecard">
        <thead>
          <tr>
            <th className="sc-corner">Hull</th>
            {t.players.map((p) => (
              <th key={p.id} className="sc-player">
                <span className="avatar avatar-xs" style={{ background: p.color }}>
                  {p.avatar || p.name.charAt(0).toUpperCase()}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holeArr.map((h) => (
            <tr key={h}>
              <th className="sc-hole">
                <button className="sc-hole-btn" onClick={() => onPick(h)}>
                  {h + 1}
                </button>
              </th>
              {t.players.map((p) => {
                const v = t.scores[p.id]?.[h] ?? 0;
                return (
                  <td key={p.id} className="sc-cell">
                    {v > 0 ? v : <span className="cell-dash">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="sc-total-row">
            <th className="sc-hole">Sum</th>
            {t.players.map((p) => {
              const total = (t.scores[p.id] ?? []).reduce((s, n) => s + (n || 0), 0);
              return (
                <td key={p.id} className="sc-cell sc-total tabnum">
                  {total > 0 ? total : "–"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function firstOpenHole(t: T | null): number {
  if (!t) return 0;
  for (let h = 0; h < t.holes; h++) {
    if (t.players.some((p) => (t.scores[p.id]?.[h] ?? 0) === 0)) return h;
  }
  return 0;
}

function rankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank === 0) return "·";
  return `${rank}.`;
}
