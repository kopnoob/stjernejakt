import { useState } from "react";
import Modal from "./Modal";

interface Props {
  recoveryCode: string | null;
  firstRun: boolean;
  /** Antall spillere på denne enheten nå — for sammenslåings-advarsel. */
  localPlayerCount: number;
  onRecover: (code: string) => Promise<number>;
  onClose: () => void;
}

/**
 * Profil-ark: viser gjenopprettingskoden (nøkkelen til spillerne dine på en ny
 * enhet) og lar deg gjenopprette med en kode fra en annen enhet.
 */
export default function ProfileModal({
  recoveryCode,
  firstRun,
  localPlayerCount,
  onRecover,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingMerge, setPendingMerge] = useState(false);

  async function copy() {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignorer */
    }
  }

  async function doRecover() {
    const c = code.trim();
    if (!c || busy) return;
    // Sammenslåings-advarsel: har du egne spillere fra før, blir de delt med
    // den andre kontoen. Be om bekreftelse først.
    if (localPlayerCount > 0 && !pendingMerge) {
      setPendingMerge(true);
      return;
    }
    setPendingMerge(false);
    setBusy(true);
    setMsg(null);
    try {
      const n = await onRecover(c);
      if (n < 0) setMsg("Fant ingen profil med den koden. Sjekk at den er riktig.");
      else {
        setMsg(n > 0 ? `Hentet ${n} spiller${n === 1 ? "" : "e"}!` : "Profil gjenopprettet.");
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="profile-title" className="profile-sheet">
      <p className="sheet-title" id="profile-title">
        {firstRun ? "Lagre gjenopprettingskoden din" : "Din profil"}
      </p>
      <p className="muted">
        {firstRun
          ? "Dette er nøkkelen til spillerne dine. Lagre den et trygt sted – med den får du dem tilbake på en ny enhet eller hvis du tømmer data."
          : "Gjenopprettingskoden henter spillerne dine tilbake på en ny enhet."}
      </p>

      <div className="recovery-code tabnum">{recoveryCode ?? "—"}</div>
      <button className="btn btn-ghost" onClick={copy} disabled={!recoveryCode}>
        {copied ? "Kopiert ✓" : "Kopier kode"}
      </button>

      <div className="profile-divider" />

      <span className="field-label muted">Har du en kode fra en annen enhet?</span>
      <input
        className="text-input"
        placeholder="Lim inn kode"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setPendingMerge(false);
        }}
        autoCapitalize="characters"
        spellCheck={false}
      />

      {pendingMerge && (
        <p className="profile-warn">
          Du har {localPlayerCount} spiller{localPlayerCount === 1 ? "" : "e"} fra før. Å legge inn
          en kode <strong>slår dem sammen</strong> med den delte kontoen — begge enheter ser alt.
          (Vil du heller dele bare én spiller, bruk «Del tilgang» på spilleren i stedet.)
        </p>
      )}

      <button className="btn btn-primary" onClick={doRecover} disabled={!code.trim() || busy}>
        {busy
          ? "Henter …"
          : pendingMerge
          ? "Slå sammen og fortsett"
          : localPlayerCount > 0
          ? "Legg til kode"
          : "Hent spillerne mine"}
      </button>
      {pendingMerge && (
        <button className="btn btn-ghost" onClick={() => setPendingMerge(false)}>
          Avbryt
        </button>
      )}
      {msg && <p className="profile-msg">{msg}</p>}

      <button className="btn btn-ghost profile-done" onClick={onClose}>
        {firstRun ? "Jeg har lagret koden" : "Lukk"}
      </button>
    </Modal>
  );
}
