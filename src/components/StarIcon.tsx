import { useId } from "react";
import type { Star } from "../types";

interface Props {
  variant: Star;
  size?: number;
  /** Tegn en dempet kontur når variant === "none". */
  outline?: boolean;
}

// G1: metallisk dybde via to-tonet gradient + spekulær glans.
const METAL: Record<Exclude<Star, "none">, [string, string, string]> = {
  // [topp-lys, midt, bunn-skygge]
  gold: ["#fde9a6", "#efb014", "#b07c0a"],
  silver: ["#f4f6f8", "#9aa6ad", "#6c777e"],
  bronze: ["#ecbd8f", "#c77b3c", "#8a5020"],
};

/** Fem-takket stjerne med metallisk finish. Brukes overalt for resultat-nivå. */
export default function StarIcon({ variant, size = 24, outline = true }: Props) {
  const uid = useId();
  const gid = `star-${uid}`;
  const points = starPoints(50, 50, 48, 20, 5);
  const isNone = variant === "none";
  const metal = isNone ? null : METAL[variant];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {metal && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metal[0]} />
            <stop offset="48%" stopColor={metal[1]} />
            <stop offset="100%" stopColor={metal[2]} />
          </linearGradient>
        </defs>
      )}
      <polygon
        points={points}
        fill={isNone ? "transparent" : `url(#${gid})`}
        stroke={isNone ? (outline ? "var(--line)" : "transparent") : "rgba(0,0,0,0.22)"}
        strokeWidth={isNone ? 4 : 2.5}
        strokeLinejoin="round"
      />
      {!isNone && (
        <>
          {/* Øvre glans */}
          <polygon points={starPoints(50, 43, 27, 11, 5)} fill="rgba(255,255,255,0.42)" />
          {/* Liten spekulær prikk */}
          <circle cx="38" cy="34" r="5" fill="rgba(255,255,255,0.55)" />
        </>
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
