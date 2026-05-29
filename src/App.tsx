import { useCallback, useEffect, useState } from "react";
import Players from "./screens/Players";
import PlayerBoard from "./screens/PlayerBoard";
import Round from "./screens/Round";
import { useApp } from "./useApp";
import { hcpProgress } from "./rules";
import { DEFAULT_HCP } from "./types";

type View =
  | { name: "players" }
  | { name: "board"; playerId: string }
  | { name: "round"; playerId: string; hcp: number; distance: number };

// ─── Hash-routing (F6) ──────────────────────────────────────────────────────
// Hash-basert ruting gjør nettleserens tilbake-knapp ekte (hvert skjerm-bytte
// blir en history-oppføring) og fungerer fint under GitHub Pages' /repo/-base.
//   #/                         → spillerliste
//   #/p/<id>                   → spiller-board
//   #/p/<id>/r/<hcp>/<dist>    → aktiv runde

function parseHash(): View {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "p" && parts[1]) {
    if (parts[2] === "r" && parts[3] && parts[4]) {
      return { name: "round", playerId: parts[1], hcp: Number(parts[3]), distance: Number(parts[4]) };
    }
    return { name: "board", playerId: parts[1] };
  }
  return { name: "players" };
}

function toHash(v: View): string {
  if (v.name === "board") return `#/p/${v.playerId}`;
  if (v.name === "round") return `#/p/${v.playerId}/r/${v.hcp}/${v.distance}`;
  return "#/";
}

function useHashRoute(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => parseHash());
  useEffect(() => {
    const onHash = () => setView(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = useCallback((v: View) => {
    const target = toHash(v);
    if (location.hash !== target) location.hash = target; // utløser hashchange
    else setView(v);
  }, []);
  return [view, navigate];
}

export default function App() {
  const app = useApp();
  const [view, navigate] = useHashRoute();

  // Hvis ruten peker på en spiller som ikke finnes (slettet / ukjent lenke),
  // send tilbake til lista — i en effekt, ikke under render.
  const missingPlayer =
    (view.name === "board" || view.name === "round") &&
    !app.loading &&
    !app.players.some((p) => p.id === view.playerId);

  useEffect(() => {
    if (missingPlayer) navigate({ name: "players" });
  }, [missingPlayer, navigate]);

  if (app.loading) {
    return (
      <div className="screen loading">
        <div className="spinner" />
      </div>
    );
  }

  if (view.name === "players") {
    return (
      <Players
        players={app.players}
        rounds={app.rounds}
        backend={app.backend}
        syncState={app.syncState}
        getHcp={app.getHcp}
        onOpen={(playerId) => navigate({ name: "board", playerId })}
        onAdd={app.addPlayer}
      />
    );
  }

  const player = app.players.find((p) => p.id === view.playerId);
  if (!player) {
    // Effekten over navigerer hjem; vis ingenting i mellomtiden.
    return null;
  }

  if (view.name === "board") {
    return (
      <PlayerBoard
        player={player}
        rounds={app.rounds}
        currentHcp={app.getHcp(player.id)}
        onBack={() => navigate({ name: "players" })}
        onStart={(hcp, distance) => navigate({ name: "round", playerId: player.id, hcp, distance })}
        onSetHcp={(hcp) => app.setCurrentHcp(player.id, hcp)}
        onDelete={async () => {
          await app.deletePlayer(player.id);
          navigate({ name: "players" });
        }}
      />
    );
  }

  // view.name === "round"
  const roundHcp = view.hcp ?? DEFAULT_HCP;
  const playerRounds = app.rounds.filter((r) => r.player_id === player.id);
  const recordsByDistance = hcpProgress(playerRounds, roundHcp).bestGoldStrokesByDistance;
  return (
    <Round
      player={player}
      initialHcp={roundHcp}
      initialDistance={view.distance ?? 30}
      recordsByDistance={recordsByDistance}
      onSave={async (hcp, distance, holes) => {
        await app.addRound(player.id, hcp, distance, holes);
      }}
      onBack={() => navigate({ name: "board", playerId: player.id })}
    />
  );
}
