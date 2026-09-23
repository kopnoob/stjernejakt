import {
  STEP_COLORS,
  STEP_NAMES,
  WINDOW_REQUIRED,
  WINDOW_SIZE,
  parseMeters,
  referenceHint,
  seriesWindow,
  type AchievementDef,
} from "../lib/achievements";
import type { TrainingEntry, TrainingOutcome } from "../types";

interface Props {
  def: AchievementDef;
  /** Høyeste trinn spilleren har på merket. */
  level: number;
  step: number;
  /** Laser/Blink: lengden som skrevet (tekst). */
  reference: string;
  /** Forsøkene i pågående serie, eldste først. */
  attempts: TrainingEntry[];
  busy: boolean;
  error: string | null;
  onStep: (step: number) => void;
  onReference: (text: string) => void;
  onOutcome: (outcome: TrainingOutcome) => void;
  onUndo: () => void;
}

// Lys tekst på mørke trinnfarger, mørk på hvit/gul/oransje.
const LIGHT_INK = new Set([1, 4, 6, 7]);

/**
 * Seriemodus: ett trykk per ball. De siste fem teller hele tiden (3 av 5),
 * så en bom nullstiller aldri noe — og trinnet kommer i det tredje treffet.
 */
export default function SeriesPad({
  def,
  level,
  step,
  reference,
  attempts,
  busy,
  error,
  onStep,
  onReference,
  onOutcome,
  onUndo,
}: Props) {
  const current = def.steps[step - 1];
  const referenceM = def.reference ? parseMeters(reference) : null;
  const needsReference = !!def.reference && referenceM === null;
  const outcomes = attempts.flatMap((a) => (a.outcome ? [a.outcome] : []));
  const win = seriesWindow(outcomes);
  const lastFive = attempts.slice(-WINDOW_SIZE);
  const earnedThis = level >= step;
  const hint = current ? referenceHint(def, current, referenceM) : null;

  let status: string;
  if (outcomes.length === 0) status = `${WINDOW_REQUIRED} treff blant de siste ${WINDOW_SIZE} gir trinnet.`;
  else if (win.passed) status = earnedThis ? "Klart! 🎉" : `${win.successes} av ${win.count}!`;
  else if (win.successes === WINDOW_REQUIRED - 1) status = `${win.successes} av de siste ${win.count} — ett treff til!`;
  else if (win.successes === 0) status = `Bare fortsett — de siste ${WINDOW_SIZE} teller.`;
  else status = `${win.successes} av de siste ${win.count}. To treff til!`;

  return (
    <section className="pad">
      <div className="pad-steps" role="radiogroup" aria-label="Velg trinn">
        {def.steps.map((s) => (
          <button
            key={s.n}
            role="radio"
            aria-checked={s.n === step}
            aria-label={`Trinn ${s.n}, ${STEP_NAMES[s.n - 1]}${s.n <= level ? ", tatt" : ""}`}
            className={`step-pick ${s.n === step ? "is-on" : ""}`}
            style={{ background: STEP_COLORS[s.n - 1], color: LIGHT_INK.has(s.n) ? "#fff" : "var(--ink)" }}
            onClick={() => onStep(s.n)}
          >
            {s.n <= level ? "✓" : s.n}
          </button>
        ))}
      </div>

      {current && (
        <p className="pad-req">
          <strong>{capitalize(STEP_NAMES[step - 1])}:</strong> {current.requirement}
        </p>
      )}
      {earnedThis && <p className="pad-note muted">Dette trinnet har du — treningen teller fortsatt.</p>}

      {def.reference && (
        <div className="pad-ref">
          <label className="field-label muted" htmlFor="pad-ref-input">
            {def.referencePrompt}
          </label>
          <div className="pad-ref-row">
            <input
              id="pad-ref-input"
              className="text-input pad-ref-input"
              inputMode="decimal"
              autoComplete="off"
              value={reference}
              onChange={(e) => onReference(e.target.value)}
              placeholder="f.eks. 80"
            />
            <span className="pad-unit">m</span>
          </div>
          <p className="pad-hint">{hint ?? "Skriv lengden, så viser appen hva som teller som treff."}</p>
        </div>
      )}

      <div className="pad-window" aria-live="polite">
        <div className="pad-balls" aria-label={`Siste ${WINDOW_SIZE} baller`}>
          {Array.from({ length: WINDOW_SIZE }, (_, i) => {
            const a = lastFive[i];
            if (!a?.outcome) return <span key={i} className="pad-ball is-empty" aria-hidden="true" />;
            const ok = a.outcome !== "miss";
            return (
              <span key={i} className={`pad-ball ${ok ? "is-hit" : "is-miss"}`} aria-label={ok ? "Treff" : "Bom"}>
                {a.outcome === "holed" ? "⛳" : ok ? "✓" : "–"}
              </span>
            );
          })}
        </div>
        <p className={`pad-status ${win.passed || win.successes === WINDOW_REQUIRED - 1 ? "is-warm" : ""}`}>
          {status}
        </p>
      </div>

      <div className={`pad-buttons n${def.outcomes?.length ?? 2}`}>
        {(def.outcomes ?? []).map((o) => (
          <button
            key={o.code}
            className={`pad-btn is-${o.code}`}
            disabled={busy || needsReference}
            onClick={() => onOutcome(o.code)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="pad-error" role="alert">
          {error}
        </p>
      )}

      <div className="pad-foot">
        <button className="btn-textlink" onClick={onUndo} disabled={busy || attempts.length === 0}>
          ↶ Angre siste
        </button>
        <span className="muted tabnum">Ball {attempts.length}</span>
      </div>

      {win.passed && earnedThis && step < def.steps.length && (
        <button className="btn btn-flight" onClick={() => onStep(step + 1)}>
          Prøv {STEP_NAMES[step]}: {def.steps[step].requirement} →
        </button>
      )}
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
