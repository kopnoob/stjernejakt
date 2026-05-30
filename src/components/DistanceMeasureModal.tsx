import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { haptic } from "../lib/haptics";
import {
  averageSamples,
  geolocationAvailable,
  haversineMeters,
  nearestDistance,
  type LatLng,
} from "../lib/geo";
import { DISTANCES } from "../types";

interface Props {
  onPick: (distance: number) => void;
  onClose: () => void;
}

type Phase = "idle" | "marking" | "ready";

// Hvor lenge vi samler posisjonsprøver når hullet markeres (demper GPS-støy).
const SAMPLE_MS = 3000;

/**
 * GPS-avstandsmåler: stå ved hullet → «Sett hull» (midles over noen sekunder),
 * gå ut til utslaget → live «ca. X m». Ærlig om at GPS bare gir en omtrentlig
 * avstand — nyttig på lange utslag, upresis på 10–20 m.
 */
export default function DistanceMeasureModal({ onPick, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState<LatLng | null>(null);
  const [hole, setHole] = useState<LatLng | null>(null);
  // Initialiser feilmelding fra tilgjengelighet (ingen setState i effekt).
  const [error, setError] = useState<string | null>(() =>
    geolocationAvailable() ? null : "Enheten har ikke posisjonstjeneste.",
  );

  const sampling = useRef<LatLng[] | null>(null);
  const markTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!geolocationAvailable()) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrent(p);
        setError(null);
        if (sampling.current) sampling.current.push(p);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED)
          setError("Gi appen tilgang til posisjon for å måle avstand.");
        else if (err.code === err.TIMEOUT)
          setError("Fant ikke GPS-signal. Prøv utendørs med åpen himmel.");
        else setError("Klarte ikke hente posisjon akkurat nå.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      if (markTimer.current != null) window.clearTimeout(markTimer.current);
    };
  }, []);

  function markHole() {
    if (!current) return;
    haptic(8);
    sampling.current = [current];
    setPhase("marking");
    markTimer.current = window.setTimeout(() => {
      const avg = averageSamples(sampling.current ?? []);
      sampling.current = null;
      markTimer.current = null;
      if (avg) {
        setHole(avg);
        setPhase("ready");
        haptic([14, 30, 14]);
      } else {
        setPhase("idle");
        setError("Fikk ikke nok signal. Prøv igjen.");
      }
    }, SAMPLE_MS);
  }

  function remark() {
    setHole(null);
    setPhase("idle");
  }

  const distance = hole && current ? haversineMeters(hole, current) : null;
  const nearest = distance != null ? nearestDistance(distance, DISTANCES) : null;
  const hasFix = current != null;

  return (
    <Modal onClose={onClose} labelledBy="measure-title" className="measure-sheet">
      <p className="sheet-title" id="measure-title">
        📍 Mål avstand
      </p>

      {error ? (
        <>
          <p className="measure-error">{error}</p>
          <button className="btn btn-ghost" onClick={onClose}>
            Lukk
          </button>
        </>
      ) : (
        <>
          <div className={`measure-acc ${hasFix ? "good" : ""}`}>
            {hasFix ? "GPS klar" : "Søker etter GPS …"}
          </div>

          {phase !== "ready" && (
            <>
              <p className="muted measure-step">
                Stå <strong>ved hullet</strong> og trykk «Sett hull». Gå deretter ut til utslaget.
              </p>
              <button
                className="btn btn-primary"
                onClick={markHole}
                disabled={!current || phase === "marking"}
              >
                {phase === "marking" ? "Måler hullet … hold i ro" : "Sett hull"}
              </button>
            </>
          )}

          {phase === "ready" && distance != null && nearest != null && (
            <>
              <div className="measure-readout">
                <span className="measure-dist tabnum">{Math.round(distance)}</span>
                <span className="measure-unit">m</span>
              </div>
              <p className="measure-nearest">
                Nærmest: <strong>{nearest} m</strong>
              </p>
              <p className="muted measure-hint">Gå ut til utslaget — tallet oppdateres mens du går.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onPick(nearest);
                  onClose();
                }}
              >
                Bruk {nearest} m
              </button>
              <button className="btn btn-ghost" onClick={remark}>
                Sett hull på nytt
              </button>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
