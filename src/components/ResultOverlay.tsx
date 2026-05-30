import { useEffect, useState } from "react";
import StarIcon from "./StarIcon";
import type { RoundResult } from "../rules";
import type { BadgeDef } from "../lib/badges";
import { playCelebration } from "../lib/sound";

interface Props {
  result: RoundResult;
  hcp: number;
  distance: number;
  playerName: string;
  /** Gull med færre slag enn noen tidligere gull-runde på dette utslaget. */
  isNewRecord?: boolean;
  /** Merker som nettopp ble låst opp av denne runden (H4). */
  newBadges?: BadgeDef[];
  onDone: () => void;
}

/**
 * Barnets egen feiringsstund (A1): navnet i fokus, en stor stjerne man kan
 * trykke på for å høre lyden igjen, lett konfetti og en jingle som matcher
 * nivået. Anerkjenner også «nesten i mål» (A3) og ny personlig rekord (A4).
 */
export default function ResultOverlay({
  result,
  hcp,
  distance,
  playerName,
  isNewRecord,
  newBadges,
  onDone,
}: Props) {
  const [show, setShow] = useState(false);
  // Endres ved hvert trykk på stjernen → restarter pop-animasjonen.
  const [tapCount, setTapCount] = useState(0);

  const hasStar = result.star !== "none";

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    playCelebration(result.star);
    return () => cancelAnimationFrame(id);
  }, [result.star]);

  function replay() {
    setTapCount((n) => n + 1);
    playCelebration(result.star);
  }

  // A3: hvor nær gull var man (kun når det fortsatt var oppnåelig og nært).
  const nearGold =
    !hasStar || result.star !== "gold"
      ? result.allReached && result.missedGoldBy != null && result.missedGoldBy <= hcp
        ? result.missedGoldBy
        : null
      : null;

  return (
    <div className="overlay">
      {hasStar && <Confetti star={result.star} />}
      <div className={`result-card ${show ? "is-in" : ""}`}>
        <button
          key={tapCount}
          className="result-star result-star-tap"
          onClick={replay}
          aria-label="Spill lyden igjen"
        >
          <StarIcon variant={result.star} size={104} />
        </button>

        <h2 className="result-title">{title(result.star, playerName)}</h2>
        <p className="result-sub muted">
          Hcp {hcp} · {distance} m · {result.holedCount}/3 i mål · {result.totalStrokes} slag
        </p>

        {isNewRecord && result.star === "gold" && (
          <p className="result-record">🏆 Ny rekord! Færreste slag hittil</p>
        )}

        {nearGold != null && (
          <p className="result-near">
            💪 Bare {nearGold} {nearGold === 1 ? "slag" : "slag"} unna gull — du er nære!
          </p>
        )}

        {result.promoted && (
          <p className="result-promo">🚀 Gull på 100 m — på tide med en hardere hcp!</p>
        )}

        {newBadges && newBadges.length > 0 && (
          <div className="result-badges">
            {newBadges.map((b) => (
              <p key={b.id} className="result-badge">
                <span className="result-badge-emoji" aria-hidden="true">
                  {b.emoji}
                </span>
                Nytt merke: <strong>{b.label}</strong>!
              </p>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-done" onClick={onDone}>
          Ferdig
        </button>
      </div>
    </div>
  );
}

function title(star: string, name: string): string {
  switch (star) {
    case "gold":
      return `Gull, ${name}! 🥇`;
    case "silver":
      return `Sølv, ${name}! 🥈`;
    case "bronze":
      return `Bronse, ${name}! 🥉`;
    default:
      return `Bra kjempet, ${name}!`;
  }
}

function Confetti({ star }: { star: string }) {
  const colors =
    star === "gold"
      ? ["#efb014", "#fbe7a6", "#fff", "#43a463"]
      : star === "silver"
      ? ["#9aa6ad", "#eceef0", "#fff"]
      : ["#c77b3c", "#f6e6d6", "#fff"];
  const count = star === "gold" ? 40 : 28;
  const pieces = Array.from({ length: count }, (_, i) => i);
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
