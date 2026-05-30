import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import Icon from "../components/Icon";
import { hcpProgress } from "../rules";
import type { Player, Round } from "../types";
import { PLAYER_AVATARS, PLAYER_COLORS } from "../types";
import type { SyncState } from "../useApp";

interface Props {
  players: Player[];
  rounds: Round[];
  backend: "supabase" | "local";
  syncState: SyncState;
  getHcp: (playerId: string) => number;
  onOpen: (playerId: string) => void;
  onAdd: (name: string, color: string, avatar: string | null) => Promise<Player>;
  onFlight: () => void;
  onTournament: () => void;
}

export default function Players({ players, rounds, backend, syncState, getHcp, onOpen, onAdd, onFlight, onTournament }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Per spiller: nåværende hcp + antall gull i det hcp-et (mer relevant
  // enn totalt antall stjerner). current_hcp er lokal (getHcp).
  const progByPlayer = useMemo(() => {
    const m = new Map<string, { hcp: number; gold: number }>();
    for (const p of players) {
      const hcp = getHcp(p.id);
      const pr = hcpProgress(rounds.filter((r) => r.player_id === p.id), hcp);
      m.set(p.id, { hcp, gold: pr.goldCount });
    }
    return m;
  }, [players, rounds, getHcp]);

  // Foreslå neste ledige farge for ny spiller.
  function openAdd() {
    const used = new Set(players.map((p) => p.color));
    const next = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
    setColor(next);
    setName("");
    setAvatar(null);
    setAdding(true);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const p = await onAdd(trimmed, color, avatar);
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
            <div className="empty-stars" aria-hidden="true">
              <StarIcon variant="bronze" size={30} />
              <StarIcon variant="gold" size={42} />
              <StarIcon variant="silver" size={30} />
            </div>
            <p className="empty-title">Klar for stjernejakt?</p>
            <p className="muted">
              Legg til barna og start jakten på bronse, sølv og gull – ett utslag av gangen.
            </p>
          </div>
        )}

        {players.map((p) => (
          <button key={p.id} className="player-card" onClick={() => onOpen(p.id)}>
            <span className="avatar" style={{ background: p.color }}>
              {p.avatar ? p.avatar : p.name.charAt(0).toUpperCase()}
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
            <div className="add-preview">
              <span className="avatar avatar-lg" style={{ background: color }}>
                {avatar ? avatar : (name.trim().charAt(0).toUpperCase() || "?")}
              </span>
            </div>
            <input
              className="text-input"
              placeholder="Fornavn eller kallenavn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={20}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <span className="field-label muted">Velg figur</span>
            <div className="avatar-row">
              {PLAYER_AVATARS.map((a) => (
                <button
                  key={a}
                  className={`avatar-pick ${avatar === a ? "is-selected" : ""}`}
                  onClick={() => setAvatar((cur) => (cur === a ? null : a))}
                  aria-label={`Velg figur ${a}`}
                  aria-pressed={avatar === a}
                >
                  {a}
                </button>
              ))}
            </div>
            <span className="field-label muted">Velg farge</span>
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

        {players.length >= 2 && !adding && (
          <div className="entry-row">
            <button className="btn btn-flight" onClick={onFlight}>
              <Icon name="flight" size={20} />
              Følg en flight
            </button>
            <button className="btn btn-flight" onClick={onTournament}>
              <Icon name="trophy" size={20} />
              Turnering
            </button>
          </div>
        )}
      </div>

      <footer className="storage-note">
        {backend === "supabase" ? (
          <span className={`sync-pill sync-${syncState}`}>
            {syncState === "syncing" && "Synkroniserer …"}
            {syncState === "synced" && "Lagret i skyen"}
            {syncState === "local" && "Lagret på enheten (synkes senere)"}
          </span>
        ) : (
          "Lagres på denne enheten"
        )}
      </footer>
    </div>
  );
}
