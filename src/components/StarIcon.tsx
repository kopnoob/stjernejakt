import type { Star } from "../types";

interface Props {
  variant: Star;
  size?: number;
  /** Tegn en dempet kontur når variant === "none". */
  outline?: boolean;
}

const FILL: Record<Star, string> = {
  none: "transparent",
  bronze: "var(--bronze)",
  silver: "var(--silver)",
  gold: "var(--gold)",
};

/** Fem-takket stjerne. Brukes overalt for å vise resultat-nivå. */
export default function StarIcon({ variant, size = 24, outline = true }: Props) {
  const points = starPoints(50, 50, 48, 20, 5);
  const isNone = variant === "none";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <polygon
        points={points}
        fill={isNone ? "transparent" : FILL[variant]}
        stroke={isNone ? (outline ? "var(--line)" : "transparent") : "rgba(0,0,0,0.18)"}
        strokeWidth={isNone ? 4 : 2.5}
        strokeLinejoin="round"
      />
      {!isNone && (
        <polygon
          points={starPoints(50, 44, 26, 11, 5)}
          fill="rgba(255,255,255,0.35)"
        />
      )}
    </svg>
  );
}

function starPoints(cx: number, cy: number, rO: number, rI: number, spikes: number): string {
  const pts: string[] = [];
  let a = -Math.PI / 2;
  const step = Math.PI / spikes;
  for (let i = 0; i < 2 * spikes; i++) {
    const r = i % 2 === 0 ? rO : rI;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    a += step;
  }
  return pts.join(" ");
}
