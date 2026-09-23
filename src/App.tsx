import { useCallback, useEffect, useState } from "react";
import Players from "./screens/Players";
import PlayerBoard from "./screens/PlayerBoard";
import Round from "./screens/Round";
import FlightSetup from "./screens/FlightSetup";
import FlightRound from "./screens/FlightRound";
import Tournaments from "./screens/Tournaments";
import Tournament from "./screens/Tournament";
import ShareClaim from "./screens/ShareClaim";
import Training from "./screens/Training";
import { useApp } from "./useApp";
import { hcpProgress } from "./rules";
import { newlyUnlocked } from "./lib/badges";
import { DEFAULT_HCP } from "./types";
import { setTrainingPlayer } from "./store";

type View =
  | { name: "players" }
  | { name: "board"; playerId: string }
  | { name: "round"; playerId: string; hcp: number; distance: number }
  | { name: "editRound"; playerId: string; roundId: string }
  | { name: "flight" }
  | { name: "flightRound"; playerIds: string[] }
  | { name: "tournaments" }
  | { name: "tournament"; id: string }
  | { name: "share"; token: string }
  | { name: "training"; exerciseId: string | null };

// ─── Hash-routing (F6) ──────────────────────────────────────────────────────
// Hash-basert ruting gjør nettleserens tilbake-knapp ekte (hvert skjerm-bytte
// blir en history-oppføring) og fungerer fint under GitHub Pages' /repo/-base.
//   #/                         → spillerliste
//   #/p/<id>                   → spiller-board
//   #/p/<id>/r/<hcp>/<dist>    → aktiv runde
//   #/flight                   → velg flight (spillere + avstand)
//   #/flight/r/<dist>/<ids>    → flight-runde (ids = komma-separert)
//   #/trening[/<øvelse>]       → trening på range/chipping/putting

function parseHash(): View {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "share" && parts[1]) {
    return { name: "share", token: parts[1] };
  }
  if (parts[0] === "trening") {
    return { name: "training", exerciseId: parts[1] ?? null };
  }
  if (parts[0] === "turnering") {
    if (parts[1]) return { name: "tournament", id: parts[1] };
    return { name: "tournaments" };
  }
  if (parts[0] === "flight") {
    if (parts[1] === "r" && parts[2]) {
      return { name: "flightRound", playerIds: parts[2].split(",").filter(Boolean) };
    }
    return { name: "flight" };
  }
  if (parts[0] === "p" && parts[1]) {
    if (parts[2] === "r" && parts[3] && parts[4]) {
      return { name: "round", playerId: parts[1], hcp: Number(parts[3]), distance: Number(parts[4]) };
    }
    if (parts[2] === "edit" && parts[3]) {
      return { name: "editRound", playerId: parts[1], roundId: parts[3] };
    }
    return { name: "board", playerId: parts[1] };
  }
  return { name: "players" };
}

function toHash(v: View): string {
  if (v.name === "board") return `#/p/${v.playerId}`;
  if (v.name === "round") return `#/p/${v.playerId}/r/${v.hcp}/${v.distance}`;
  if (v.name === "editRound") return `#/p/${v.playerId}/edit/${v.roundId}`;
  if (v.name === "flight") return "#/flight";
  if (v.name === "flightRound") return `#/flight/r/${v.playerIds.join(",")}`;
  if (v.name === "tournaments") return "#/turnering";
  if (v.name === "tournament") return `#/turnering/${v.id}`;
  if (v.name === "share") return `#/share/${v.token}`;
  if (v.name === "training") return v.exerciseId ? `#/trening/${v.exerciseId}` : "#/trening";
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
    (view.name === "board" || view.name === "round" || view.name === "editRound") &&
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
        onFlight={() => navigate({ name: "flight" })}
        onTournament={() => navigate({ name: "tournaments" })}
        onTraining={() => navigate({ name: "training", exerciseId: null })}
        onRecover={app.recover}
        onReorder={app.reorderPlayers}
      />
    );
  }

  if (view.name === "share") {
    return (
      <ShareClaim
        token={view.token}
        onClaim={app.claimShare}
        onOpen={(playerId) => navigate({ name: "board", playerId })}
        onHome={() => navigate({ name: "players" })}
      />
    );
  }

  if (view.name === "training") {
    return (
      <Training
        players={app.players}
        rounds={app.rounds}
        entries={app.entries}
        exerciseId={view.exerciseId}
        onOpenExercise={(exerciseId) => navigate({ name: "training", exerciseId })}
        onHome={() => navigate({ name: "players" })}
        onAdd={app.addTrainingEntry}
        onUndo={app.undoTrainingEntry}
        onAward={app.awardCoach}
      />
    );
  }

  if (view.name === "tournaments") {
    return (
      <Tournaments
        players={app.players}
        getHcp={app.getHcp}
        onBack={() => navigate({ name: "players" })}
        onOpen={(id) => navigate({ name: "tournament", id })}
      />
    );
  }

  if (view.name === "tournament") {
    return (
      <Tournament
        id={view.id}
        onBack={() => navigate({ name: "tournaments" })}
      />
    );
  }

  if (view.name === "flight") {
    return (
      <FlightSetup
        players={app.players}
        getHcp={app.getHcp}
        onBack={() => navigate({ name: "players" })}
        onStart={(playerIds) => navigate({ name: "flightRound", playerIds })}
      />
    );
  }

  if (view.name === "flightRound") {
    const flightPlayers = view.playerIds
      .map((id) => app.players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    if (flightPlayers.length < 2) {
      // Ugyldig lenke / spillere slettet — tilbake til oppsett.
      return (
        <FlightSetup
          players={app.players}
          getHcp={app.getHcp}
          onBack={() => navigate({ name: "players" })}
          onStart={(playerIds) => navigate({ name: "flightRound", playerIds })}
        />
      );
    }
    // Forhåndsvalgt utslag pr spiller = det de jobber med i reisen (laveste
    // utslag uten gull på sitt nåværende handicap).
    const suggestedDistance: Record<string, number> = {};
    for (const p of flightPlayers) {
      const pr = app.rounds.filter((r) => r.player_id === p.id);
      suggestedDistance[p.id] = hcpProgress(pr, app.getHcp(p.id)).nextDistance ?? 30;
    }
    return (
      <FlightRound
        players={flightPlayers}
        suggestedDistance={suggestedDistance}
        getHcp={app.getHcp}
        onSaveAll={app.addRounds}
        onBack={() => navigate({ name: "players" })}
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
        entries={app.entries}
        currentHcp={app.getHcp(player.id)}
        onBack={() => navigate({ name: "players" })}
        onStart={(hcp, distance) => navigate({ name: "round", playerId: player.id, hcp, distance })}
        onSetHcp={(hcp) => app.setCurrentHcp(player.id, hcp)}
        onShareAccess={() => app.shareLink(player.id)}
        onEditRound={(roundId) => navigate({ name: "editRound", playerId: player.id, roundId })}
        onDeleteRound={app.deleteRound}
        onTrain={() => {
          setTrainingPlayer(player.id);
          navigate({ name: "training", exerciseId: null });
        }}
        onAward={(award, note) => app.awardCoach(player.id, award, note)}
        onDeleteEntry={app.undoTrainingEntry}
        onDelete={async () => {
          await app.deletePlayer(player.id);
          navigate({ name: "players" });
        }}
      />
    );
  }

  if (view.name === "editRound") {
    const r = app.rounds.find((x) => x.id === view.roundId);
    if (!r) {
      navigate({ name: "board", playerId: player.id });
      return null;
    }
    return (
      <Round
        player={player}
        initialHcp={r.hcp}
        initialDistance={r.distance}
        recordsByDistance={{}}
        existing={r}
        onSave={async (hcp, distance, holes) => {
          await app.editRound(r.id, hcp, distance, holes);
        }}
        onBack={() => navigate({ name: "board", playerId: player.id })}
      />
    );
  }

  // view.name === "round"
  const roundHcp = view.hcp ?? DEFAULT_HCP;
  const playerRounds = app.rounds.filter((r) => r.player_id === player.id);
  const playerEntries = app.entries.filter((e) => e.player_id === player.id);
  const recordsByDistance = hcpProgress(playerRounds, roundHcp).bestGoldStrokesByDistance;
  return (
    <Round
      player={player}
      initialHcp={roundHcp}
      initialDistance={view.distance ?? 30}
      recordsByDistance={recordsByDistance}
      onSave={async (hcp, distance, holes) => {
        // H4: hvilke merker låste denne runden opp? (før vs etter)
        const newRound = await app.addRound(player.id, hcp, distance, holes);
        return newlyUnlocked(playerRounds, [...playerRounds, newRound], playerEntries);
      }}
      onBack={() => navigate({ name: "board", playerId: player.id })}
    />
  );
}
