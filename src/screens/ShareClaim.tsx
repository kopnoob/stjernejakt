import { useEffect, useRef, useState } from "react";

interface Props {
  token: string;
  onClaim: (token: string) => Promise<string | null>;
  onOpen: (playerId: string) => void;
  onHome: () => void;
}

/** Åpnes via en delingslenke (#/share/<token>): henter tilgang og åpner spilleren. */
export default function ShareClaim({ token, onClaim, onOpen, onHome }: Props) {
  const [status, setStatus] = useState<"working" | "error">("working");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    onClaim(token).then((playerId) => {
      if (playerId) onOpen(playerId);
      else setStatus("error");
    });
  }, [token, onClaim, onOpen]);

  if (status === "working") {
    return (
      <div className="screen loading">
        <div className="spinner" />
        <p className="muted" style={{ marginTop: 16 }}>
          Henter tilgang …
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="empty" style={{ marginTop: 40 }}>
        <p className="empty-title">Lenken virket ikke</p>
        <p className="muted">
          Delingslenken er ugyldig eller utløpt. Be om en ny fra den som delte
          spilleren.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onHome}>
          Til mine spillere
        </button>
      </div>
    </div>
  );
}
