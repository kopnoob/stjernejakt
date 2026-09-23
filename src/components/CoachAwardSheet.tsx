import { useState } from "react";
import Modal from "./Modal";
import { COACH_KINDS } from "../lib/achievements";
import type { CoachAwardKind, Player } from "../types";

interface Props {
  player: Player;
  onAward: (award: CoachAwardKind, note: string | null) => Promise<void>;
  onClose: () => void;
}

const NOTE_MAX = 140;

/** Trenerens merke: for innsats, godt samspill, mot eller fremgang. */
export default function CoachAwardSheet({ player, onAward, onClose }: Props) {
  const [award, setAward] = useState<CoachAwardKind>("innsats");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      await onAward(award, note.trim() || null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="trenermerke-tittel">
      <p className="sheet-title" id="trenermerke-tittel">
        ❤️ Trenerens merke til {player.name}
      </p>
      <p className="muted">For noe som ikke står i tabellene — innsats, samspill, mot eller fremgang.</p>

      <div className="coach-kinds" role="radiogroup" aria-label="Hva er merket for?">
        {COACH_KINDS.map((k) => (
          <button
            key={k.id}
            role="radio"
            aria-checked={award === k.id}
            className={`coach-kind ${award === k.id ? "is-selected" : ""}`}
            onClick={() => setAward(k.id)}
          >
            <span className="coach-kind-emoji" aria-hidden="true">
              {k.emoji}
            </span>
            {k.label}
          </button>
        ))}
      </div>

      <label className="field-label muted" htmlFor="trenermerke-note">
        Begrunnelse (valgfritt)
      </label>
      <input
        id="trenermerke-note"
        className="text-input coach-note"
        value={note}
        maxLength={NOTE_MAX}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Hjalp de andre å samle baller"
      />

      <div className="add-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Avbryt
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          Gi merket
        </button>
      </div>
    </Modal>
  );
}
