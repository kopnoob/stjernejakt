import { useEffect, useMemo, useRef, useState } from "react";
import BadgePin from "../components/BadgePin";
import CoachAwardSheet from "../components/CoachAwardSheet";
import Icon from "../components/Icon";
import LengthPad from "../components/LengthPad";
import SeriesPad from "../components/SeriesPad";
import TrainingCelebration from "../components/TrainingCelebration";
import {
  ACHIEVEMENTS,
  STEP_COLORS,
  STEP_NAMES,
  TRAINING_AREAS,
  computeBag,
  fmtNum,
  getAchievement,
  localDayKey,
  newlyEarned,
  parseMeters,
  type EarnedItem,
} from "../lib/achievements";
import { haptic } from "../lib/haptics";
import { getTrainingPlayer, newId, setTrainingPlayer } from "../store";
import type { CoachAwardKind, Player, Round, TrainingEntry, TrainingOutcome } from "../types";
import type { NewTrainingEntry } from "../useApp";

interface Props {
  players: Player[];
  rounds: Round[];
  entries: TrainingEntry[];
  /** Åpen øvelse (fra ruten), eller null for oversikten. */
  exerciseId: string | null;
  onOpenExercise: (id: string | null) => void;
  onHome: () => void;
  onAdd: (e: NewTrainingEntry) => Promise<TrainingEntry>;
  onUndo: (entryId: string) => Promise<void>;
  onAward: (playerId: string, award: CoachAwardKind, note: string | null) => Promise<TrainingEntry>;
}

interface Memory {
  step: number;
  reference: string;
}

interface Celebration {
  player: Player;
  items: EarnedItem[];
  record: number | null;
}

const MAX_STEP = 7;

function byTime(a: TrainingEntry, b: TrainingEntry): number {
  return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
}

/**
 * Trening på range, chipping-green og putting-green. All input er manuell
 * (lengde eller treff/bom). Én enhet kan gå på rundgang mellom barna:
 * hver spiller har sin egen pågående serie, så de blandes aldri.
 */
export default function Training({
  players,
  rounds,
  entries,
  exerciseId,
  onOpenExercise,
  onHome,
  onAdd,
  onUndo,
  onAward,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = getTrainingPlayer();
    return players.some((p) => p.id === saved) ? saved : (players[0]?.id ?? null);
  });
  const [memory, setMemory] = useState<Record<string, Memory>>({});
  const [seriesIds, setSeriesIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [awardOpen, setAwardOpen] = useState(false);
  const [today] = useState(() => localDayKey(new Date().toISOString()));
  const lock = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const player = players.find((p) => p.id === activeId) ?? null;
  const playerRounds = useMemo(() => rounds.filter((r) => r.player_id === activeId), [rounds, activeId]);
  const playerEntries = useMemo(() => entries.filter((e) => e.player_id === activeId), [entries, activeId]);
  const bag = useMemo(() => computeBag(playerRounds, playerEntries), [playerRounds, playerEntries]);

  const def = exerciseId ? getAchievement(exerciseId) : undefined;
  const exercise = def && (def.kind === "value" || def.kind === "series") ? def : null;
  const level = exercise ? bag.badges[exercise.id].level : 0;
  const memKey = player && exercise ? `${player.id}|${exercise.id}` : "";
  const mem: Memory = memory[memKey] ?? { step: Math.min(level + 1, MAX_STEP), reference: "" };
  const seriesKey = `${memKey}|${mem.step}|${parseMeters(mem.reference) ?? ""}`;
  const seriesId = seriesIds[seriesKey];
  const seriesAttempts = seriesId
    ? playerEntries.filter((e) => e.series_id === seriesId).sort(byTime)
    : [];

  function selectPlayer(id: string) {
    setActiveId(id);
    setTrainingPlayer(id);
    setError(null);
  }

  /** Kjør én lagring om gangen (hindrer dobbeltrykk som lager to serier). */
  async function guarded(fn: () => Promise<void>): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch {
      setError("Kunne ikke lagre — prøv igjen.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function openExercise(id: string) {
    const target = getAchievement(id);
    if (player && target?.kind === "series") {
      // Hopp til neste trinn hvis det valgte allerede er tatt.
      const key = `${player.id}|${id}`;
      const lvl = bag.badges[id].level;
      setMemory((prev) => {
        const cur = prev[key];
        const step = cur && (cur.step > lvl || lvl >= MAX_STEP) ? cur.step : Math.min(lvl + 1, MAX_STEP);
        return { ...prev, [key]: { step, reference: cur?.reference ?? "" } };
      });
    }
    setError(null);
    onOpenExercise(id);
  }

  function setMem(next: Memory) {
    setMemory((prev) => ({ ...prev, [memKey]: next }));
  }

  async function register(input: NewTrainingEntry): Promise<{ entry: TrainingEntry; items: EarnedItem[] }> {
    const before = computeBag(playerRounds, playerEntries);
    const entry = await onAdd(input);
    const items = newlyEarned(before, computeBag(playerRounds, [...playerEntries, entry]));
    return { entry, items };
  }

  function handleOutcome(outcome: TrainingOutcome) {
    if (!player || !exercise) return;
    const reference = exercise.reference ? parseMeters(mem.reference) : null;
    if (exercise.reference && reference === null) {
      setError("Skriv lengden først.");
      return;
    }
    const key = seriesKey;
    const sid = seriesId ?? newId();
    const p = player;
    void guarded(async () => {
      // Lås valget, så trinnet ikke flytter seg når nivået oppdateres.
      setMemory((prev) => ({ ...prev, [memKey]: mem }));
      setSeriesIds((prev) => ({ ...prev, [key]: sid }));
      const { items } = await register({
        player_id: p.id,
        kind: "attempt",
        badge_id: exercise.id,
        step: mem.step,
        outcome,
        value_m: null,
        reference_m: reference,
        series_id: sid,
        award: null,
        note: null,
      });
      if (items.length > 0) setCelebration({ player: p, items, record: null });
      else haptic(8);
    });
  }

  function handleUndoSeries() {
    const last = seriesAttempts[seriesAttempts.length - 1];
    if (!last) return;
    void guarded(() => onUndo(last.id));
  }

  const todaysLengths = exercise?.kind === "value"
    ? playerEntries
        .filter((e) => e.badge_id === exercise.id && localDayKey(e.created_at) === today)
        .sort(byTime)
    : [];

  async function handleLength(valueM: number): Promise<boolean> {
    if (!player || !exercise) return false;
    const p = player;
    const previous = bag.badges[exercise.id].record ?? null;
    return guarded(async () => {
      const { items } = await register({
        player_id: p.id,
        kind: "attempt",
        badge_id: exercise.id,
        step: null,
        outcome: null,
        value_m: valueM,
        reference_m: null,
        series_id: null,
        award: null,
        note: null,
      });
      const isRecord = previous == null || valueM > previous;
      if (items.length > 0) {
        setCelebration({ player: p, items, record: isRecord ? valueM : null });
      } else {
        haptic(8);
        setToast(isRecord ? `🚀 Ny rekord: ${fmtNum(valueM)} m!` : `Notert: ${fmtNum(valueM)} m`);
      }
    });
  }

  function handleUndoLength() {
    const last = todaysLengths[todaysLengths.length - 1];
    if (!last) return;
    void guarded(() => onUndo(last.id));
  }

  async function handleAward(award: CoachAwardKind, note: string | null) {
    if (!player) return;
    const p = player;
    const before = computeBag(playerRounds, playerEntries);
    const entry = await onAward(p.id, award, note);
    setAwardOpen(false);
    const items = newlyEarned(before, computeBag(playerRounds, [...playerEntries, entry]));
    setCelebration({ player: p, items, record: null });
  }

  return (
    <div className="screen training-screen">
      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() => (exercise ? onOpenExercise(null) : onHome())}
          aria-label={exercise ? "Tilbake til øvelsene" : "Tilbake"}
        >
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title">
          {exercise ? (
            <>
              <span aria-hidden="true">{exercise.emoji}</span> {exercise.name}
            </>
          ) : (
            "Trening"
          )}
        </span>
        <span />
      </header>

      {players.length === 0 ? (
        <div className="empty">
          <p className="empty-title">Ingen spillere ennå</p>
          <p className="muted">Legg til barna først, så kan dere samle merker på treningsfeltet.</p>
          <button className="btn btn-primary" onClick={onHome}>
            Til spillerne
          </button>
        </div>
      ) : (
        <>
          <div className="train-players" role="radiogroup" aria-label="Hvem trener?">
            {players.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={p.id === activeId}
                className={`train-player ${p.id === activeId ? "is-on" : ""}`}
                style={p.id === activeId ? { borderColor: p.color } : undefined}
                onClick={() => selectPlayer(p.id)}
              >
                <span className="avatar-mini" style={{ background: p.color }}>
                  {p.avatar || p.name.charAt(0).toUpperCase()}
                </span>
                {p.name}
              </button>
            ))}
          </div>

          {player && exercise ? (
            <>
              <p className="train-desc muted">{exercise.description}</p>
              {exercise.kind === "value" ? (
                <LengthPad
                  def={exercise}
                  state={bag.badges[exercise.id]}
                  todays={todaysLengths}
                  busy={busy}
                  error={error}
                  onSubmit={handleLength}
                  onUndo={handleUndoLength}
                />
              ) : (
                <SeriesPad
                  def={exercise}
                  level={level}
                  step={mem.step}
                  reference={mem.reference}
                  attempts={seriesAttempts}
                  busy={busy}
                  error={error}
                  onStep={(step) => {
                    setError(null);
                    setMem({ ...mem, step });
                  }}
                  onReference={(reference) => setMem({ ...mem, reference })}
                  onOutcome={handleOutcome}
                  onUndo={handleUndoSeries}
                />
              )}
            </>
          ) : (
            player && <ExerciseList bag={bag} onOpen={openExercise} />
          )}

          {player && (
            <button className="btn-textlink train-award" onClick={() => setAwardOpen(true)}>
              ❤️ Gi trenerens merke til {player.name}
            </button>
          )}
        </>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {awardOpen && player && (
        <CoachAwardSheet player={player} onAward={handleAward} onClose={() => setAwardOpen(false)} />
      )}

      {celebration && (
        <TrainingCelebration
          player={celebration.player}
          items={celebration.items}
          record={celebration.record}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
}

function ExerciseList({
  bag,
  onOpen,
}: {
  bag: ReturnType<typeof computeBag>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="train-areas">
      {TRAINING_AREAS.map((area) => (
        <section key={area.id} className="train-area" aria-labelledby={`area-${area.id}`}>
          <h2 id={`area-${area.id}`} className="train-area-title">
            {area.name}
          </h2>
          {ACHIEVEMENTS.filter((a) => a.area === area.id && (a.kind === "value" || a.kind === "series")).map((a) => {
            const lvl = bag.badges[a.id].level;
            const next = a.steps[lvl] ?? null;
            return (
              <button key={a.id} className="train-ex" onClick={() => onOpen(a.id)}>
                <BadgePin emoji={a.emoji} level={lvl} size={52} label={`${a.name}, trinn ${lvl} av 7`} />
                <span className="train-ex-info">
                  <span className="train-ex-name">{a.name}</span>
                  <span className="train-ex-next muted">
                    {next ? (
                      <>
                        <span
                          className="step-dot is-small"
                          aria-hidden="true"
                          style={{ background: STEP_COLORS[next.n - 1] }}
                        />{" "}
                        Neste: {STEP_NAMES[next.n - 1]} · {next.requirement}
                      </>
                    ) : (
                      "Alle 7 trinn klart 🏆"
                    )}
                  </span>
                </span>
                <span className="train-ex-go" aria-hidden="true">
                  ▶
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
