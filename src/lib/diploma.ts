// C1: tegn et delbart diplom (PNG) på canvas og del via navigator.share,
// med nedlasting som fallback. Ingen eksterne assets — alt tegnes lokalt.

import type { Star } from "../types";

export interface DiplomaData {
  name: string;
  avatar: string | null;
  color: string;
  hcp: number;
  goldCount: number;
  starPoints: number;
  maxPoints: number;
  completed: boolean;
  dateLabel: string;
  starsByDistance: { distance: number; star: Star }[];
}

const C = {
  cream: "#f4efe4",
  card: "#fffdf8",
  green: "#1f6b43",
  ink: "#20342a",
  ink2: "#5c6b62",
  line: "#e3dccc",
  gold: "#efb014",
  silver: "#9aa6ad",
  bronze: "#c77b3c",
};

const STAR_FILL: Record<Star, string | null> = {
  none: null,
  bronze: C.bronze,
  silver: C.silver,
  gold: C.gold,
};

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rO: number, rI: number) {
  ctx.beginPath();
  let a = -Math.PI / 2;
  const step = Math.PI / 5;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    a += step;
  }
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Tegn diplomet og returner en PNG-blob. */
export async function buildDiploma(d: DiplomaData): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Sørg for at egne fonter er klare (self-hostet i D2).
  try {
    await document.fonts.ready;
  } catch {
    /* ignorer */
  }
  const display = (px: number, weight = 700) => `${weight} ${px}px Fredoka, system-ui, sans-serif`;
  const body = (px: number, weight = 400) => `${weight} ${px}px Inter, system-ui, sans-serif`;

  // Bakgrunn
  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, W, H);

  // Indre kort med ramme
  const m = 56;
  roundRect(ctx, m, m, W - 2 * m, H - 2 * m, 44);
  ctx.fillStyle = C.card;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.gold;
  ctx.stroke();

  ctx.textAlign = "center";

  // Dekorstjerner øverst
  const topStars: { x: number; s: number; v: Star }[] = [
    { x: W / 2 - 130, s: 34, v: "bronze" },
    { x: W / 2, s: 48, v: "gold" },
    { x: W / 2 + 130, s: 34, v: "silver" },
  ];
  for (const t of topStars) {
    starPath(ctx, t.x, 180, t.s, t.s * 0.42);
    ctx.fillStyle = STAR_FILL[t.v] ?? C.line;
    ctx.fill();
  }

  // Tittel
  ctx.fillStyle = C.green;
  ctx.font = display(78);
  ctx.fillText("Stjernejakt", W / 2, 300);
  ctx.fillStyle = C.ink2;
  ctx.font = body(30, 500);
  ctx.fillText("D I P L O M", W / 2, 350);

  // Avatar-sirkel
  const ay = 470;
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, ay, 78, 0, Math.PI * 2);
  ctx.fillStyle = d.color;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.font = display(70);
  ctx.textBaseline = "middle";
  ctx.fillText(d.avatar || d.name.charAt(0).toUpperCase(), W / 2, ay + 6);
  ctx.textBaseline = "alphabetic";

  // Navn
  ctx.fillStyle = C.ink;
  ctx.font = display(72);
  ctx.fillText(d.name, W / 2, 660);

  // Undertittel
  ctx.fillStyle = d.completed ? C.green : C.ink2;
  ctx.font = display(44, 600);
  ctx.fillText(
    d.completed ? `Handicap ${d.hcp} fullført!` : `Handicap ${d.hcp}`,
    W / 2,
    726,
  );

  // Stjernerad (7 utslag)
  const items = d.starsByDistance;
  const n = items.length;
  const gap = (W - 2 * m - 120) / n;
  const startX = m + 60 + gap / 2;
  const rowY = 880;
  items.forEach((it, i) => {
    const x = startX + i * gap;
    const fill = STAR_FILL[it.star];
    starPath(ctx, x, rowY, 38, 16);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.stroke();
    } else {
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.line;
      ctx.stroke();
    }
    ctx.fillStyle = C.ink2;
    ctx.font = body(26, 600);
    ctx.fillText(`${it.distance}m`, x, rowY + 78);
  });

  // Statistikk
  ctx.fillStyle = C.ink;
  ctx.font = display(50, 600);
  ctx.fillText(`${d.goldCount} av 7 gull`, W / 2, 1070);
  ctx.fillStyle = C.ink2;
  ctx.font = body(32, 500);
  ctx.fillText(`${d.starPoints} av ${d.maxPoints} stjernepoeng`, W / 2, 1120);

  // Dato + ⛳
  ctx.fillStyle = C.ink2;
  ctx.font = body(30, 500);
  ctx.fillText(`⛳  ${d.dateLabel}`, W / 2, H - 110);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob feilet"))), "image/png"),
  );
}

export type ShareOutcome = "shared" | "downloaded";

/** Del PNG via systemets delingsark; fall tilbake til nedlasting. */
export async function shareDiploma(blob: Blob, name: string): Promise<ShareOutcome> {
  const safe = name.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40) || "diplom";
  const file = new File([blob], `stjernejakt-${safe}.png`, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], title: "Stjernejakt", text: `${name} sin stjernejakt!` });
      return "shared";
    } catch (e) {
      // Bruker avbrøt deling — ikke en feil.
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
