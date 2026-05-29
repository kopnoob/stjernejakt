import { useState } from "react";
import Icon from "../components/Icon";
import type { Player } from "../types";
import { DISTANCES, DISTANCE_COLOR } from "../types";

interface Props {
  players: Player[];
  getHcp: (playerId: string) => number;
  onBack: () => void;
  onStart: (distance: number, playerIds: string[]) => void;
}

const MAX_FLIGHT = 4;

/** Velg en flight (2–4 spillere) + felles utslag, før felles scoring. */
export default function FlightSetup({ players, getHcp, onBack, onStart }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [distance, setDistance] = useState(30);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_FLIGHT) return prev; // tak på flight-størrelse
      return [...prev, id];
    });
  }

  const canStart = selected.length >= 2;

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title">
          <Icon name="flight" size={20} /> Følg en flight
        </span>
        <span style={{ width: 44 }} />
      </header>

      <p className="flight-intro muted">
        Velg hvem som spiller sammen (2–{MAX_FLIGHT}). Alle slår fra samme utslag,
        men hver spiller jaktes på sitt eget handicap.
      </p>

      <div className="flight-pick">
        {players.map((p) => {
          const on = selected.includes(p.id);
          const order = selected.indexOf(p.id) + 1;
          return (
            <button
              key={p.id}
              className={`flight-pick-row ${on ? "is-on" : ""}`}
              onClick={() => toggle(p.id)}
              aria-pressed={on}
            >
              <span className="avatar" style={{ background: p.color }}>
                {p.avatar || p.name.charAt(0).toUpperCase()}
              </span>
              <span className="flight-pick-info">
                <span className="player-card-name">{p.name}</span>
                <span className="muted">Handicap {getHcp(p.id)}</span>
              </span>
              <span className={`flight-check ${on ? "is-on" : ""}`}>{on ? order : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="setup-group flight-dist">
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

      <div className="save-bar is-ready">
        <span className="muted save-hint">
          {canStart
            ? `${selected.length} spillere · ${distance} m`
            : "Velg minst 2 spillere"}
        </span>
        <button
          className="btn btn-primary"
          disabled={!canStart}
          onClick={() => onStart(distance, selected)}
        >
          Start flight
        </button>
      </div>
    </div>
  );
}
