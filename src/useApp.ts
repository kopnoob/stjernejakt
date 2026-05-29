import { useCallback, useEffect, useState } from "react";
import { newId, store } from "./store";
import type { HoleResult, Player, Round, Star } from "./types";
import { evaluateRound } from "./rules";

/** Sentral app-state: laster spillere + runder én gang, oppdaterer optimistisk. */
export function useApp() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    store.load().then((snap) => {
      if (!alive) return;
      setPlayers(snap.players);
      setRounds(snap.rounds);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const addPlayer = useCallback(
    async (name: string, color: string, startHcp = 5): Promise<Player> => {
      const p: Player = {
        id: newId(),
        name: name.trim(),
        color,
        current_hcp: startHcp,
        created_at: new Date().toISOString(),
      };
      setPlayers((prev) => [...prev, p]);
      await store.savePlayer(p);
      return p;
    },
    [],
  );

  const setCurrentHcp = useCallback(
    async (playerId: string, hcp: number): Promise<void> => {
      let updated: Player | undefined;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== playerId) return p;
          updated = { ...p, current_hcp: hcp };
          return updated;
        }),
      );
      if (updated) await store.savePlayer(updated);
    },
    [],
  );

  const deletePlayer = useCallback(async (id: string): Promise<void> => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    setRounds((prev) => prev.filter((r) => r.player_id !== id));
    await store.deletePlayer(id);
  }, []);

  const addRound = useCallback(
    async (playerId: string, hcp: number, distance: number, holes: HoleResult[]): Promise<Round> => {
      const res = evaluateRound(holes, hcp, distance);
      const r: Round = {
        id: newId(),
        player_id: playerId,
        hcp,
        distance,
        star: res.star as Star,
        holed_count: res.holedCount,
        total_strokes: res.totalStrokes,
        holes,
        created_at: new Date().toISOString(),
      };
      setRounds((prev) => [...prev, r]);
      await store.saveRound(r);
      return r;
    },
    [],
  );

  return {
    players,
    rounds,
    loading,
    addPlayer,
    deletePlayer,
    addRound,
    setCurrentHcp,
    backend: store.backend,
  };
}
