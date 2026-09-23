import { STEP_COLORS } from "../lib/achievements";

export type PinVariant = "ladder" | "moment" | "coach" | "mystery";

interface Props {
  emoji: string;
  /** Skjermleser-tekst. */
  label: string;
  variant?: PinVariant;
  /** Oppnådd trinn 0–7 (bare for stiger). */
  level?: number;
  size?: number;
  /** Antall trenermerker — vises som ×n når flere enn ett. */
  count?: number;
  /** Sprett inn (feiringen). */
  pop?: boolean;
}

const TAU = Math.PI * 2;

/**
 * Et merke som en rund pin i samme formspråk som bagtagen: 7 prikker i
 * kjeglefargene rundt figuren, og en ring i fargen til trinnet man har nådd.
 * Uoppnådde trinn er bare små omriss — merket vokser, det krysses ikke av.
 */
export default function BadgePin({ emoji, label, variant = "ladder", level = 0, size = 64, count, pop = false }: Props) {
  if (variant === "mystery") {
    return (
      <svg className="pin" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label}>
        <circle cx={50} cy={50} r={45} fill="none" style={{ stroke: "var(--ink-3)" }} strokeWidth={2.5} strokeDasharray="7 6" />
        <text
          x={50}
          y={53}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={42}
          fontWeight={700}
          style={{ fill: "var(--ink-3)", fontFamily: "var(--display)" }}
        >
          ?
        </text>
      </svg>
    );
  }

  const ring =
    variant === "ladder"
      ? level > 0
        ? STEP_COLORS[level - 1]
        : "var(--line)"
      : variant === "moment"
        ? "var(--gold)"
        : "var(--d100)";

  return (
    <svg
      className={`pin ${pop ? "pin-pop" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
    >
      <circle cx={50} cy={50} r={47} style={{ fill: "var(--card)", stroke: "var(--ink-3)" }} strokeWidth={1} />
      <circle cx={50} cy={50} r={42.5} fill="none" style={{ stroke: ring }} strokeWidth={6.5} />
      <circle cx={50} cy={50} r={45.9} fill="none" style={{ stroke: "var(--ink)" }} strokeWidth={0.8} opacity={0.3} />
      <circle cx={50} cy={50} r={39.1} fill="none" style={{ stroke: "var(--ink)" }} strokeWidth={0.8} opacity={0.3} />

      {variant === "moment" && (
        <circle cx={50} cy={50} r={33} fill="none" style={{ stroke: "var(--gold)" }} strokeWidth={1.4} strokeDasharray="2 3" />
      )}

      {variant === "ladder" &&
        STEP_COLORS.map((color, i) => {
          const angle = -Math.PI / 2 + (i / STEP_COLORS.length) * TAU;
          const x = 50 + 29 * Math.cos(angle);
          const y = 50 + 29 * Math.sin(angle);
          return i < level ? (
            <circle key={i} cx={x} cy={y} r={5.2} style={{ fill: color, stroke: "var(--ink)" }} strokeWidth={0.9} />
          ) : (
            <circle key={i} cx={x} cy={y} r={3.1} fill="none" style={{ stroke: "var(--ink-3)" }} strokeWidth={1.1} />
          );
        })}

      <text x={50} y={52} textAnchor="middle" dominantBaseline="central" fontSize={variant === "ladder" ? 28 : 36}>
        {emoji}
      </text>

      {count !== undefined && count > 1 && (
        <g>
          <circle cx={82} cy={18} r={14} style={{ fill: "var(--green)", stroke: "var(--card)" }} strokeWidth={2.5} />
          <text
            x={82}
            y={19}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fontWeight={700}
            style={{ fill: "#fff", fontFamily: "var(--display)" }}
          >
            ×{count}
          </text>
        </g>
      )}
    </svg>
  );
}
