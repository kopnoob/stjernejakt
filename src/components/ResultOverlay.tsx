import { useEffect, useState } from "react";
import StarIcon from "./StarIcon";
import type { RoundResult } from "../rules";

interface Props {
  result: RoundResult;
  hcp: number;
  distance: number;
  onDone: () => void;
}

/** Kort, smakelig resultat-reveal. Lett konfetti kun ved stjerne. */
export default function ResultOverlay({ result, hcp, distance, onDone }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const hasStar = result.star !== "none";

  return (
    <div className="overlay">
      {hasStar && <Confetti star={result.star} />}
      <div className={`result-card ${show ? "is-in" : ""}`}>
        <div className="result-star">
          <StarIcon variant={result.star} size={96} />
        </div>
        <h2 className="result-title">{title(result.star)}</h2>
        <p className="result-sub muted">
          Hcp {hcp} · {distance} m · {result.holedCount}/3 i mål · {result.totalStrokes} slag
        </p>
        {result.promoted && (
          <p className="result-promo">🚀 Gull på 100 m — på tide med en hardere hcp!</p>
        )}
        <button className="btn btn-primary btn-done" onClick={onDone}>
          Ferdig
        </button>
      </div>
    </div>
  );
}

function title(star: string): string {
  switch (star) {
    case "gold":
      return "Gull! 🥇";
    case "silver":
      return "Sølv! 🥈";
    case "bronze":
      return "Bronse! 🥉";
    default:
      return "Bra forsøk!";
  }
}

function Confetti({ star }: { star: string }) {
  const colors =
    star === "gold"
      ? ["#efb014", "#fbe7a6", "#fff", "#43a463"]
      : star === "silver"
      ? ["#9aa6ad", "#eceef0", "#fff"]
      : ["#c77b3c", "#f6e6d6", "#fff"];
  const pieces = Array.from({ length: 28 }, (_, i) => i);
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
