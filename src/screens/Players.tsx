import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import { hcpProgress } from "../rules";
import type { Player, Round } from "../types";
import { PLAYER_COLORS } from "../types";

interface Props {
  players: Player[];
  rounds: Round[];
  backend: "supabase" | "local";
  onOpen: (playerId: string) => void;
  onAdd: (name: string, color: string) => Promise<Player>;
}

export default function Players({ players, rounds, backend, onOpen, onAdd }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLORS[0]);

  // Per spiller: nåværende hcp + antall gull i det hcp-et (mer relevant
  // enn totalt antall stjerner).
  const progByPlayer = useMemo(() => {
    const m = new Map<string, { hcp: number; gold: number }>();
    for (const p of players) {
      const pr = hcpProgress(rounds.filter((r) => r.player_id === p.id), p.current_hcp);
      m.set(p.id, { hcp: p.current_hcp, gold: pr.goldCount });
    }
    return m;
  }, [players, rounds]);

  // Foreslå neste ledige farge for ny spiller.
  function openAdd() {
    const used = new Set(players.map((p) => p.color));
    const next = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
    setColor(next);
    setName("");
    setAdding(true);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p = await onAdd(trimmed, color);
    setAdding(false);
    onOpen(p.id);
  }

  return (
    <div className="screen">
      <header className="home-hero">
        <div className="home-stars" aria-hidden="true">
          <StarIcon variant="gold" size={26} />
          <StarIcon variant="silver" size={34} />
          <StarIcon variant="bronze" size={26} />
        </div>
        <h1 className="home-title">Stjernejakt</h1>
        <p className="home-sub">Hold styr på stjernene på banen</p>
      </header>

      <div className="list">
        {players.length === 0 && !adding && (
          <div className="empty">
            <p>Ingen spillere ennå.</p>
            <p className="muted">Legg til barna dine for å begynne å samle stjerner.</p>
          </div>
        )}

        {players.map((p) => (
          <button key={p.id} className="player-card" onClick={() => onOpen(p.id)}>
            <span className="avatar" style={{ background: p.color }}>
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className="player-card-info">
              <span className="player-card-name">{p.name}</span>
              <span className="player-card-sub muted">
                Handicap {progByPlayer.get(p.id)?.hcp ?? 5}
              </span>
            </span>
            <span className="player-card-stars tabnum">
              {progByPlayer.get(p.id)?.gold ?? 0}/7
              <StarIcon variant="gold" size={18} />
            </span>
          </button>
        ))}

        {adding ? (
          <div className="add-form">
            <input
              className="text-input"
              placeholder="Navn på spiller"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <div className="color-row">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-dot ${color === c ? "is-selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Velg farge ${c}`}
                />
              ))}
            </div>
            <div className="add-actions">
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>
                Avbryt
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={!name.trim()}>
                Legg til
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-add" onClick={openAdd}>
            + Ny spiller
          </button>
        )}
      </div>

      <footer className="storage-note">
        {backend === "supabase" ? "Lagres i skyen (Supabase)" : "Lagres på denne enheten"}
      </footer>
    </div>
  );
}
