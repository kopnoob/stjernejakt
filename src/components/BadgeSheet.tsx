import { useState } from "react";
import BadgePin from "./BadgePin";
import Modal from "./Modal";
import {
  COACH_KINDS,
  STEP_COLORS,
  STEP_NAMES,
  fmtNum,
  isLadder,
  type AchievementDef,
  type BadgeState,
} from "../lib/achievements";

interface Props {
  def: AchievementDef;
  state: BadgeState;
  onClose: () => void;
  /** «Tren nå» for øvelser (null for øvrige merker). */
  onTrain: (() => void) | null;
  onDeleteAward: (entryId: string) => void;
}

/**
 * Historien til ett merke: trinnene spilleren har tatt (med dato) og neste
 * trinn. Resten vises bare som fargeprikker — ingen liste å krysse av.
 */
export default function BadgeSheet({ def, state, onClose, onTrain, onDeleteAward }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const ladder = isLadder(def);
  const next = ladder ? (def.steps[state.level] ?? null) : null;
  const later = ladder ? def.steps.slice(state.level + 1) : [];
  const awards = state.awards ?? [];
  const latestKind = COACH_KINDS.find((k) => k.id === awards[0]?.award);

  return (
    <Modal onClose={onClose} labelledBy="merke-tittel">
      <div className="badge-sheet-head">
        <BadgePin
          emoji={def.kind === "coach" ? (latestKind?.emoji ?? def.emoji) : def.emoji}
          variant={ladder ? "ladder" : def.kind === "coach" ? "coach" : "moment"}
          level={state.level}
          count={def.kind === "coach" ? awards.length : undefined}
          size={84}
          label={def.name}
        />
        <div>
          <p className="sheet-title" id="merke-tittel">
            {def.name}
          </p>
          <p className="muted badge-sheet-desc">{def.description}</p>
        </div>
      </div>

      {ladder && (
        <>
          {def.kind === "value" && state.record != null && (
            <p className="badge-sheet-fact">🏆 Lengste slag: {fmtNum(state.record)} m</p>
          )}
          {def.kind === "count" && <p className="badge-sheet-fact">{state.progress ?? 0} dager så langt</p>}
          <ol className="badge-steps">
            {state.earned.map((e) => (
              <li key={e.step} className="badge-step">
                <Dot color={STEP_COLORS[e.step - 1]} />
                <span className="badge-step-text">
                  <strong>{capitalize(STEP_NAMES[e.step - 1])}:</strong> {def.steps[e.step - 1]?.requirement}
                </span>
                <span className="badge-step-date muted">{dateLabel(e.at)}</span>
              </li>
            ))}
            {next && (
              <li className="badge-step is-next">
                <Dot color={STEP_COLORS[next.n - 1]} />
                <span className="badge-step-text">
                  <strong>Neste – {STEP_NAMES[next.n - 1]}:</strong> {next.requirement}
                </span>
              </li>
            )}
          </ol>
          {later.length > 0 && (
            <div className="badge-later" aria-label={`${later.length} trinn til etter det`}>
              {later.map((s) => (
                <Dot key={s.n} color={STEP_COLORS[s.n - 1]} small />
              ))}
            </div>
          )}
          {!next && <p className="badge-sheet-fact">Alle 7 trinn klart 🏆</p>}
        </>
      )}

      {def.kind === "moment" && state.earned[0] && (
        <p className="badge-sheet-fact">
          Oppnådd {dateLabel(state.earned[0].at)}
          {def.id === "chip-in" && (state.count ?? 0) > 1 ? ` · ${state.count} chip-ins totalt` : ""}
        </p>
      )}

      {def.kind === "coach" && (
        <ul className="coach-awards">
          {awards.map((a) => {
            const kind = COACH_KINDS.find((k) => k.id === a.award);
            return (
              <li key={a.id} className="coach-award">
                <span className="coach-award-emoji" aria-hidden="true">
                  {kind?.emoji}
                </span>
                <span className="coach-award-text">
                  <strong>{kind?.label}</strong>
                  {a.note && <span className="muted">«{a.note}»</span>}
                  <span className="muted coach-award-date">{dateLabel(a.created_at)}</span>
                </span>
                {confirmId === a.id ? (
                  <span className="coach-award-confirm">
                    <button className="btn-textlink" onClick={() => setConfirmId(null)}>
                      Avbryt
                    </button>
                    <button
                      className="btn-textlink menu-danger"
                      onClick={() => {
                        setConfirmId(null);
                        onDeleteAward(a.id);
                      }}
                    >
                      Slett
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn-textlink coach-award-del"
                    onClick={() => setConfirmId(a.id)}
                    aria-label={`Slett trenermerket ${kind?.label ?? ""}`}
                  >
                    Slett
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="add-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Lukk
        </button>
        {onTrain && (
          <button className="btn btn-primary" onClick={onTrain}>
            Tren nå
          </button>
        )}
      </div>
    </Modal>
  );
}

function Dot({ color, small = false }: { color: string; small?: boolean }) {
  return <span aria-hidden="true" className={`step-dot ${small ? "is-small" : ""}`} style={{ background: color }} />;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}
