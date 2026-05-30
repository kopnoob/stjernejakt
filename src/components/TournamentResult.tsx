import { useEffect, useState } from "react";
import { playCelebration } from "../lib/sound";
import { isComplete, type Standing, type Tournament } from "../lib/tournaments";

interface Props {
  tournament: Tournament;
  standings: Standing[];
  onDone: () => void;
}

/** Sluttresultat / live ledertavle for en turnering, med vinner og konfetti. */
export default function TournamentResult({ tournament, standings, onDone }: Props) {
  const [show, setShow] = useState(false);
  const done = isComplete(tournament);
  const played = standings.filter((s) => s.thru > 0);
  const winners = played.filter((s) => s.rank === 1);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    if (done) playCelebration("gold");
    return () => cancelAnimationFrame(id);
  }, [done]);

  return (
    <div className="overlay">
      {done && <Confetti />}
      <div className={`result-card flight-result ${show ? "is-in" : ""}`}>
        <h2 className="result-title flight-result-title">
          {done ? "Vinner! 🏆" : "Ledertavle"}
        </h2>
        <p className="result-sub muted">
          {tournament.name} · {tournament.holes} hull
        </p>

        {done && winners.length > 0 && (
          <p className="tour-winner">
            {winners.map((w) => w.player.name).join(" & ")}
            <span className="muted"> · {winners[0].total} slag</span>
          </p>
        )}

        <ul className="flight-result-list">
          {standings.map((s, i) => (
            <li
              key={s.player.id}
              className={`flight-result-row ${s.rank === 1 && s.thru > 0 ? "is-leader" : ""}`}
              style={{ animationDelay: `${0.08 + i * 0.1}s` }}
            >
              <span className="lb-rank">{rankLabel(s.rank)}</span>
              <span className="avatar avatar-sm" style={{ background: s.player.color }}>
                {s.player.avatar || s.player.name.charAt(0).toUpperCase()}
              </span>
              <span className="flight-result-name">{s.player.name}</span>
              <span className="flight-result-detail muted tabnum">
                {s.thru > 0 ? `${s.thru}/${tournament.holes}` : "–"}
              </span>
              <span className="tour-result-total tabnum">{s.thru > 0 ? s.total : "–"}</span>
            </li>
          ))}
        </ul>

        <button className="btn btn-primary btn-done" onClick={onDone}>
          {done ? "Ferdig" : "Tilbake"}
        </button>
      </div>
    </div>
  );
}

function rankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  if (rank === 0) return "·";
  return `${rank}.`;
}

function Confetti() {
  const colors = ["#efb014", "#fbe7a6", "#fff", "#43a463"];
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 7) * 0.08;
        const dur = 1.6 + ((i * 13) % 10) / 10;
        const c = colors[i % colors.length];
        const rot = (i * 47) % 360;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: c,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              transform: `rotate(${rot}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
