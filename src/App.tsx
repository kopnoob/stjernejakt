import { useState } from "react";
import Players from "./screens/Players";
import PlayerBoard from "./screens/PlayerBoard";
import Round from "./screens/Round";
import { useApp } from "./useApp";
import { DEFAULT_HCP } from "./types";

type View =
  | { name: "players" }
  | { name: "board"; playerId: string }
  | { name: "round"; playerId: string; hcp: number; distance: number };

export default function App() {
  const app = useApp();
  const [view, setView] = useState<View>({ name: "players" });

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
        onOpen={(playerId) => setView({ name: "board", playerId })}
        onAdd={app.addPlayer}
      />
    );
  }

  const player = app.players.find((p) => p.id === view.playerId);
  if (!player) {
    // Spiller finnes ikke lenger (f.eks. slettet) — tilbake til lista.
    setView({ name: "players" });
    return null;
  }

  if (view.name === "board") {
    return (
      <PlayerBoard
        player={player}
        rounds={app.rounds}
        onBack={() => setView({ name: "players" })}
        onStart={(hcp, distance) => setView({ name: "round", playerId: player.id, hcp, distance })}
        onSetHcp={(hcp) => app.setCurrentHcp(player.id, hcp)}
        onDelete={async () => {
          await app.deletePlayer(player.id);
          setView({ name: "players" });
        }}
      />
    );
  }

  // view.name === "round"
  return (
    <Round
      player={player}
      initialHcp={view.hcp ?? DEFAULT_HCP}
      initialDistance={view.distance ?? 30}
      onSave={async (hcp, distance, holes) => {
        await app.addRound(player.id, hcp, distance, holes);
      }}
      onBack={() => setView({ name: "board", playerId: player.id })}
    />
  );
}
