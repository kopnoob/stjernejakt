// Liten, asset-fri feiringslyd via Web Audio. Trygt mtp. autoplay: lyden
// utløses alltid av brukerens «Lagre»- eller stjerne-trykk.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, gain = 0.16) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Celebration = "gold" | "silver" | "bronze" | "none";

/** Spill en kort, glad jingle som matcher prestasjonen. */
export function playCelebration(level: Celebration) {
  const ac = audio();
  if (!ac) return;
  if (level === "none") {
    tone(ac, 392, 0, 0.22, 0.1); // mild, oppmuntrende enkelttone
    return;
  }
  const notes =
    level === "gold"
      ? [523, 659, 784, 1047] // C-E-G-C↑ (full fanfare)
      : level === "silver"
      ? [523, 659, 784]
      : [523, 659];
  notes.forEach((f, i) => tone(ac, f, i * 0.12, 0.34));
}
