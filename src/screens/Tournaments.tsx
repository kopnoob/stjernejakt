import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import type { Player } from "../types";
import {
  createTournament,
  isComplete,
  listTournaments,
  standings,
  type TPlayer,
} from "../lib/tournaments";

interface Props {
  players: Player[];
  getHcp: (playerId: string) => number;
  onBack: () => void;
  onOpen: (id: string) => void;
}

const MIN_HOLES = 1;
const MAX_HOLES = 18;

export default function Tournaments({ players, onBack, onOpen }: Props) {
  const existing = useMemo(() => listTournaments(), []);
  const [creating, setCreating] = useState(existing.length === 0);
  const [name, setName] = useState(defaultName());
  const [holes, setHoles] = useState(6);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function start() {
    const chosen: TPlayer[] = players
      .filter((p) => selected.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, color: p.color, avatar: p.avatar ?? null }));
    if (chosen.length < 2) return;
    const t = createTournament(name, holes, chosen);
    onOpen(t.id);
  }

  const canStart = selected.length >= 2;

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title">
          <Icon name="trophy" size={20} /> Turnering
        </span>
        <span style={{ width: 44 }} />
      </header>

      {!creating && (
        <>
          <div className="list">
            {existing.map((t) => {
              const board = standings(t);
              const leader = board.find((s) => s.rank === 1);
              const done = isComplete(t);
              return (
                <button key={t.id} className="tour-card" onClick={() => onOpen(t.id)}>
                  <span className="tour-card-main">
                    <span className="tour-card-name">{t.name}</span>
                    <span className="muted tour-card-sub">
                      {t.players.length} spillere · {t.holes} hull · {formatDate(t.date)}
                    </span>
                  </span>
                  <span className={`tour-badge ${done ? "is-done" : "is-live"}`}>
                    {done ? (leader ? `🏆 ${leader.player.name}` : "Ferdig") : "Pågår"}
                  </span>
                </button>
              );
            })}
          </div>
          <button className="btn btn-add" onClick={() => setCreating(true)}>
            + Ny turnering
          </button>
        </>
      )}

      {creating && (
        <div className="add-form">
          <span className="field-label muted">Navn</span>
          <input
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Turnering"
          />

          <span className="field-label muted">Antall hull</span>
          <div className="holes-stepper">
            <button
              className="fl-step"
              onClick={() => setHoles((h) => Math.max(MIN_HOLES, h - 1))}
              disabled={holes <= MIN_HOLES}
              aria-label="Færre hull"
            >
              −
            </button>
            <span className="holes-value tabnum">{holes}</span>
            <button
              className="fl-step"
              onClick={() => setHoles((h) => Math.min(MAX_HOLES, h + 1))}
              disabled={holes >= MAX_HOLES}
              aria-label="Flere hull"
            >
              +
            </button>
          </div>

          <span className="field-label muted">Spillere</span>
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
                  </span>
                  <span className={`flight-check ${on ? "is-on" : ""}`}>{on ? order : ""}</span>
                </button>
              );
            })}
          </div>

          <div className="add-actions">
            {existing.length > 0 && (
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>
                Avbryt
              </button>
            )}
            <button className="btn btn-primary" onClick={start} disabled={!canStart}>
              Start turnering
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function defaultName(): string {
  const d = new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long" });
  return `Turnering ${d}`;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}
