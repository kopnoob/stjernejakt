import { useEffect, useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import Icon from "../components/Icon";
import ResultOverlay from "../components/ResultOverlay";
import RulesModal from "../components/RulesModal";
import { evaluateRound } from "../rules";
import { haptic } from "../lib/haptics";
import { clearRoundDraft, getRoundDraft, holesHaveInput, saveRoundDraft } from "../lib/draft";
import type { BadgeDef } from "../lib/badges";
import type { HoleResult, Player, Round as RoundType } from "../types";
import { DISTANCES, DISTANCE_COLOR, HOLES_PER_ROUND } from "../types";

interface Props {
  player: Player;
  initialHcp: number;
  initialDistance: number;
  /** Beste gull-score (færrest slag) pr utslag på dette hcp FØR runden — for A4-rekord. */
  recordsByDistance: Record<number, number | null>;
  /** Hvis satt: rediger en eksisterende runde (forhåndsfyll, ingen feiring). */
  existing?: RoundType;
  /** Lagrer runden. Returnerer merker som ble låst opp (H4), eller void (redigering). */
  onSave: (hcp: number, distance: number, holes: HoleResult[]) => Promise<BadgeDef[] | void>;
  onBack: () => void;
}

const MAX_STROKES = 20;
const freshHoles = (): HoleResult[] => [
  { strokes: 0, pickedUp: false },
  { strokes: 0, pickedUp: false },
  { strokes: 0, pickedUp: false },
];

export default function Round({
  player,
  initialHcp,
  initialDistance,
  recordsByDistance,
  existing,
  onSave,
  onBack,
}: Props) {
  const isEdit = !!existing;
  // Hcp er fast for runden (valgt på boardet før start) — flyten er ledende,
  // så vi redigerer ikke hcp midt i runden.
  const hcp = initialHcp;
  const [distance, setDistance] = useState(initialDistance);
  // Frys rekord-tabellen ved oppstart (hcp er fast hele runden), slik at A4
  // vurderer mot historikk FØR denne runden ble lagret — ellers ville lagring
  // oppdatere props og «ny rekord» forsvinne. useState-initialisator fanger
  // verdien én gang (settes aldri på nytt).
  const [priorRecords] = useState(() => recordsByDistance);
  // Slagene beholdes hvis man bytter utslag — man retter ofte opp en feil
  // eller ombestemmer seg midt i runden. Ved redigering: forhåndsfyll.
  const [holes, setHoles] = useState<HoleResult[]>(() =>
    existing ? existing.holes.map((h) => ({ ...h })) : freshHoles(),
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeDef[]>([]);

  // A1: autosave-utkast (ikke ved redigering av eksisterende runde).
  const [initialDraft] = useState(() => (isEdit ? null : getRoundDraft(player.id)));
  const resumable = !!(initialDraft && initialDraft.hcp === hcp && holesHaveInput(initialDraft.holes));
  const [dismissedResume, setDismissedResume] = useState(false);
  const showResume = resumable && !dismissedResume;

  // Skriv utkast løpende (kun når noe er tastet, så et tomt skjema ikke
  // overskriver et eksisterende utkast ved oppstart).
  useEffect(() => {
    if (isEdit) return;
    if (holesHaveInput(holes)) saveRoundDraft(player.id, { hcp, distance, holes });
  }, [holes, distance, hcp, isEdit, player.id]);

  function resumeDraft() {
    if (!initialDraft) return;
    setDistance(initialDraft.distance);
    setHoles(initialDraft.holes.map((h) => ({ ...h })));
    setDismissedResume(true);
  }
  function discardDraft() {
    clearRoundDraft(player.id);
    setDismissedResume(true);
  }

  function bumpStrokes(i: number, delta: number) {
    haptic(8);
    setHoles((prev) => {
      const next = prev.slice();
      // +/− henter tilbake tall-feltet hvis hullet var plukket opp.
      const strokes = Math.max(0, Math.min(MAX_STROKES, next[i].strokes + delta));
      next[i] = { strokes, pickedUp: false };
      return next;
    });
  }
  function togglePickedUp(i: number) {
    haptic(8);
    setHoles((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], pickedUp: !next[i].pickedUp };
      return next;
    });
  }

  const setHolesList = holes.filter((h) => h.pickedUp || h.strokes > 0);
  const allSet = holes.every((h) => h.pickedUp || h.strokes > 0);

  const totalStrokes = useMemo(() => holes.reduce((s, h) => s + h.strokes, 0), [holes]);
  const anyPickedUp = holes.some((h) => h.pickedUp);
  const holedSoFar = useMemo(
    () => setHolesList.filter((h) => !h.pickedUp && h.strokes <= hcp).length,
    [setHolesList, hcp],
  );

  const finalResult = useMemo(() => {
    if (!allSet) return null;
    return evaluateRound(holes, hcp, distance);
  }, [allSet, holes, hcp, distance]);

  // A4: ny personlig rekord = gull med færre slag enn beste tidligere gull
  // (eller første gull noensinne på dette utslaget).
  const isNewRecord =
    finalResult?.star === "gold" &&
    (priorRecords[distance] == null || finalResult.totalStrokes < priorRecords[distance]!);

  const threshold = 3 * hcp;

  async function handleSave() {
    // F3: lås mot dobbel-lagring (rask dobbelttrykk → to runder).
    if (!allSet || saving || saved) return;
    haptic([18, 40, 18]);
    setSaving(true);
    try {
      const unlocked = await onSave(hcp, distance, holes);
      if (isEdit) {
        onBack(); // redigering: ingen feiring, rett tilbake til historikken
        return;
      }
      clearRoundDraft(player.id); // utkast fullført → fjern
      setNewBadges(Array.isArray(unlocked) ? unlocked : []);
      setSaved(true); // viser feiringen først når lagring er fullført
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen round-screen">
      <header className="topbar has-actions">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title topbar-title-stack">
          <span className="topbar-name">
            <span className="dot" style={{ background: player.color }} />
            {player.name}
          </span>
          <span className="topbar-hcp">{isEdit ? "Rediger · " : ""}Handicap {hcp}</span>
        </span>
        <span className="topbar-actions">
          <button
            className="icon-btn"
            onClick={() => setRulesOpen(true)}
            aria-label="Slik fungerer Stjernejakt"
          >
            <Icon name="info" size={20} />
          </button>
          <span className="round-prog tabnum" aria-label="Hull spilt">
            {setHolesList.length}/{HOLES_PER_ROUND}
          </span>
        </span>
      </header>

      {showResume && initialDraft && (
        <div className="resume-banner">
          <span className="resume-text">
            ↩ Uferdig runde ({initialDraft.distance} m) — fortsett der du slapp?
          </span>
          <div className="resume-actions">
            <button className="btn btn-primary resume-go" onClick={resumeDraft}>
              Fortsett
            </button>
            <button className="btn btn-ghost resume-x" onClick={discardDraft}>
              Forkast
            </button>
          </div>
        </div>
      )}

      {/* Oppsett: kun utslag (hcp er fast). Slag beholdes ved bytte av utslag. */}
      <section className="setup">
        <div className="setup-group">
          <span className="setup-label">Utslag (m)</span>
          <div className="chip-row">
            {DISTANCES.map((v) => (
              <button
                key={v}
                className={`chip chip-dist ${distance === v ? "is-active" : ""}`}
                onClick={() => setDistance(v)}
              >
                <span className="cone-sm" style={{ background: DISTANCE_COLOR[v] }} />
                {v}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Tre hull samtidig */}
      <section className="holes">
        {[0, 1, 2].map((i) => (
          <HoleCard
            key={i}
            index={i}
            hcp={hcp}
            hole={holes[i]}
            onBump={(d) => bumpStrokes(i, d)}
            onTogglePickedUp={() => togglePickedUp(i)}
          />
        ))}
      </section>

      {/* Bunnlinje med resultat + lagre */}
      <div className={`save-bar ${allSet ? "is-ready" : ""}`}>
        {finalResult ? (
          <div className="save-result">
            <StarIcon variant={finalResult.star} size={38} />
            <div className="save-result-text">
              <strong>{starLabel(finalResult.star)}</strong>
              <span className="muted">
                {finalResult.holedCount}/3 i mål
                {anyPickedUp ? " · plukket opp" : ` · ${finalResult.totalStrokes}/${threshold} slag`}
              </span>
            </div>
          </div>
        ) : (
          <span className="muted save-hint">
            Registrer alle 3 hull · {holedSoFar} i mål
            {anyPickedUp ? " · plukket opp" : ` · ${totalStrokes}/${threshold} slag`}
          </span>
        )}
        <button
          className="btn btn-primary btn-save"
          disabled={!allSet || saving || saved}
          onClick={handleSave}
        >
          {saving ? "Lagrer …" : "Lagre"}
        </button>
      </div>

      {saved && finalResult && (
        <ResultOverlay
          result={finalResult}
          hcp={hcp}
          distance={distance}
          playerName={player.name}
          isNewRecord={isNewRecord}
          newBadges={newBadges}
          onDone={onBack}
        />
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

function HoleCard({
  index,
  hcp,
  hole,
  onBump,
  onTogglePickedUp,
}: {
  index: number;
  hcp: number;
  hole: HoleResult;
  onBump: (delta: number) => void;
  onTogglePickedUp: () => void;
}) {
  const isSet = hole.pickedUp || hole.strokes > 0;
  const status = !isSet
    ? null
    : hole.pickedUp
    ? { txt: "Plukket opp", cls: "st-fail" }
    : hole.strokes <= hcp
    ? { txt: `I mål · ${hole.strokes} slag`, cls: "st-holed" }
    : { txt: `Fullført · ${hole.strokes} slag`, cls: "st-over" };

  return (
    <div className={`hole-card ${isSet ? "is-set" : ""} ${hole.pickedUp ? "is-pickup" : ""}`}>
      <div className="hole-head">
        <span className="hole-name">Hull {index + 1}</span>
        {status && <span className={`hole-status ${status.cls}`}>{status.txt}</span>}
      </div>

      <div className="hole-input">
        <div className="stepper">
          <button
            className="step-btn"
            onClick={() => onBump(-1)}
            disabled={!hole.pickedUp && hole.strokes === 0}
            aria-label={`Færre slag på hull ${index + 1}`}
          >
            −
          </button>
          <span className="step-value tabnum">
            <strong key={hole.pickedUp ? "x" : hole.strokes} className="num-pop">
              {hole.pickedUp ? "✕" : hole.strokes || "–"}
            </strong>
            <span className="step-unit">{hole.pickedUp ? "plukket opp" : "slag"}</span>
          </span>
          <button
            className="step-btn"
            onClick={() => onBump(1)}
            aria-label={`Flere slag på hull ${index + 1}`}
          >
            +
          </button>
        </div>

        <button
          className={`pickup-toggle ${hole.pickedUp ? "is-on" : ""}`}
          onClick={onTogglePickedUp}
          aria-pressed={hole.pickedUp}
        >
          Plukk opp
        </button>
      </div>
    </div>
  );
}

function starLabel(star: string): string {
  switch (star) {
    case "gold":
      return "Gull!";
    case "silver":
      return "Sølv!";
    case "bronze":
      return "Bronse!";
    default:
      return "Ingen stjerne";
  }
}
