import { useEffect, useState } from "react";
import StarIcon from "./StarIcon";
import { playCelebration } from "../lib/sound";
import type { FlightOutcome } from "../screens/FlightRound";
import type { Star } from "../types";
import { STAR_RANK } from "../types";

interface Props {
  outcomes: FlightOutcome[];
  onDone: () => void;
}

/** Felles resultatskjerm for en flight — alles stjerner på én gang. */
export default function FlightResultOverlay({ outcomes, onDone }: Props) {
  const [show, setShow] = useState(false);

  const best = outcomes.reduce<Star>(
    (acc, o) => (STAR_RANK[o.result.star] > STAR_RANK[acc] ? o.result.star : acc),
    "none",
  );
  const anyGold = outcomes.some((o) => o.result.star === "gold");

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    playCelebration(best);
    return () => cancelAnimationFrame(id);
  }, [best]);

  return (
    <div className="overlay">
      {anyGold && <Confetti />}
      <div className={`result-card flight-result ${show ? "is-in" : ""}`}>
        <h2 className="result-title flight-result-title">Flight-resultat</h2>

        <ul className="flight-result-list">
          {outcomes.map((o, i) => (
            <li
              key={o.player.id}
              className="flight-result-row"
              style={{ animationDelay: `${0.1 + i * 0.12}s` }}
            >
              <span className="avatar avatar-sm" style={{ background: o.player.color }}>
                {o.player.avatar || o.player.name.charAt(0).toUpperCase()}
              </span>
              <span className="flight-result-name">
                {o.player.name}
                <span className="muted"> · {o.distance} m</span>
              </span>
              <span className="flight-result-detail muted tabnum">
                {o.result.holedCount}/3
              </span>
              <span className="flight-result-star">
                <StarIcon variant={o.result.star} size={30} outline={false} />
              </span>
            </li>
          ))}
        </ul>

        <button className="btn btn-primary btn-done" onClick={onDone}>
          Ferdig
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ["#efb014", "#fbe7a6", "#fff", "#43a463"];
  const pieces = Array.from({ length: 36 }, (_, i) => i);
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
