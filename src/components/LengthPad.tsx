import { useState } from "react";
import { STEP_COLORS, STEP_NAMES, fmtNum, parseMeters, type AchievementDef, type BadgeState } from "../lib/achievements";
import type { TrainingEntry } from "../types";

interface Props {
  def: AchievementDef;
  state: BadgeState;
  /** Dagens registrerte lengder for spilleren, eldste først. */
  todays: TrainingEntry[];
  busy: boolean;
  error: string | null;
  /** Returnerer true når lengden ble lagret (feltet tømmes da). */
  onSubmit: (valueM: number) => Promise<boolean>;
  onUndo: () => void;
}

/** Rakett: tast total lengde på slaget. Ett godt slag holder. */
export default function LengthPad({ def, state, todays, busy, error, onSubmit, onUndo }: Props) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const record = state.record ?? null;
  const next = def.steps[state.level] ?? null;

  async function submit() {
    const value = parseMeters(text);
    if (value === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (await onSubmit(value)) setText("");
  }

  return (
    <section className="pad">
      <div className="pad-record">
        <p className="pad-record-main">
          {record != null ? `🏆 Lengste slag: ${fmtNum(record)} m` : "Ingen lengde registrert ennå"}
        </p>
        <p className="muted pad-record-next">
          {next ? (
            <>
              Neste:{" "}
              <span className="step-dot is-small" aria-hidden="true" style={{ background: STEP_COLORS[next.n - 1] }} />{" "}
              {STEP_NAMES[next.n - 1]} · {next.short}
              {record != null && next.threshold != null && ` (${fmtNum(next.threshold - record)} m igjen)`}
            </>
          ) : (
            "Alle 7 trinn klart 🏆 Nye rekorder feires fortsatt."
          )}
        </p>
      </div>

      <label className="field-label muted" htmlFor="rakett-lengde">
        Total lengde (fra Trackman eller målt)
      </label>
      <div className="pad-ref-row">
        <input
          id="rakett-lengde"
          className="text-input pad-length-input"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="f.eks. 92"
          aria-invalid={invalid}
          aria-describedby={invalid ? "rakett-feil" : undefined}
        />
        <span className="pad-unit">m</span>
        <button className="btn btn-primary pad-length-save" onClick={submit} disabled={busy}>
          Registrer
        </button>
      </div>
      {invalid && (
        <p id="rakett-feil" className="pad-error" role="alert">
          Skriv en lengde mellom 1 og 500 m.
        </p>
      )}
      {error && (
        <p className="pad-error" role="alert">
          {error}
        </p>
      )}

      {todays.length > 0 && (
        <div className="pad-today">
          <span className="field-label muted">I dag</span>
          <ul className="pad-today-list">
            {todays.map((e) => (
              <li key={e.id} className={`today-chip tabnum ${e.value_m === record ? "is-earned" : ""}`}>
                {fmtNum(e.value_m ?? 0)} m{e.value_m === record ? " ⭐" : ""}
              </li>
            ))}
          </ul>
          <button className="btn-textlink" onClick={onUndo} disabled={busy}>
            ↶ Angre siste
          </button>
        </div>
      )}
    </section>
  );
}
