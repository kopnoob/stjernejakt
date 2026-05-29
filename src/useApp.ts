import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentHcp, newId, setCurrentHcpLocal, store } from "./store";
import type { HoleResult, Player, Round, Star } from "./types";
import { evaluateRound } from "./rules";

export type SyncState = "syncing" | "synced" | "local";

/** Sentral app-state: laster spillere + runder, oppdaterer optimistisk. */
export function useApp() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>(
    store.backend === "supabase" ? "syncing" : "local",
  );
  // current_hcp er lokal enhets-preferanse; hold en kopi i state for re-render.
  const [hcpMap, setHcpMap] = useState<Record<string, number>>({});
  const reloadRef = useRef<() => void>(() => {});

  const reload = useCallback(async () => {
    if (store.backend === "supabase") setSyncState("syncing");
    const snap = await store.load();
    setPlayers(snap.players);
    setRounds(snap.rounds);
    setHcpMap((prev) => {
      const next = { ...prev };
      for (const p of snap.players) if (!(p.id in next)) next[p.id] = getCurrentHcp(p.id);
      return next;
    });
    setLoading(false);
    if (store.backend === "supabase") setSyncState(snap.syncedRemote ? "synced" : "local");
  }, []);

  useEffect(() => {
    reloadRef.current = reload;
    let alive = true;
    // Engangs-innlasting ved mount (ekstern kilde → React). setState skjer
    // asynkront inni reload; dette er nettopp en effekt-jobb.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reload]);

  // F2: prøv synk på nytt når nett kommer tilbake.
  useEffect(() => {
    if (store.backend !== "supabase") return;
    const onOnline = () => reloadRef.current();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  function applySync(synced: boolean) {
    if (store.backend === "supabase") setSyncState(synced ? "synced" : "local");
  }

  const addPlayer = useCallback(
    async (name: string, color: string, avatar: string | null = null, startHcp = 5): Promise<Player> => {
      const p: Player = {
        id: newId(),
        name: name.trim(),
        color,
        avatar,
        created_at: new Date().toISOString(),
      };
      setPlayers((prev) => [...prev, p]);
      setCurrentHcpLocal(p.id, startHcp);
      setHcpMap((prev) => ({ ...prev, [p.id]: startHcp }));
      applySync((await store.savePlayer(p)).synced);
      return p;
    },
    [],
  );

  const getHcp = useCallback((playerId: string): number => hcpMap[playerId] ?? 5, [hcpMap]);

  const setCurrentHcp = useCallback((playerId: string, hcp: number): void => {
    setCurrentHcpLocal(playerId, hcp);
    setHcpMap((prev) => ({ ...prev, [playerId]: hcp }));
  }, []);

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
      applySync((await store.saveRound(r)).synced);
      return r;
    },
    [],
  );

  // Lagre flere runder samtidig (flight) — én optimistisk oppdatering, og
  // synkstatus reflekterer om ALT kom opp i skyen.
  const addRounds = useCallback(
    async (entries: { playerId: string; hcp: number; distance: number; holes: HoleResult[] }[]): Promise<Round[]> => {
      const newRounds: Round[] = entries.map((e) => {
        const res = evaluateRound(e.holes, e.hcp, e.distance);
        return {
          id: newId(),
          player_id: e.playerId,
          hcp: e.hcp,
          distance: e.distance,
          star: res.star as Star,
          holed_count: res.holedCount,
          total_strokes: res.totalStrokes,
          holes: e.holes,
          created_at: new Date().toISOString(),
        };
      });
      setRounds((prev) => [...prev, ...newRounds]);
      let allSynced = true;
      for (const r of newRounds) {
        const { synced } = await store.saveRound(r);
        if (!synced) allSynced = false;
      }
      applySync(allSynced);
      return newRounds;
    },
    [],
  );

  return {
    players,
    rounds,
    loading,
    syncState,
    addPlayer,
    deletePlayer,
    addRound,
    addRounds,
    getHcp,
    setCurrentHcp,
    backend: store.backend,
  };
}
