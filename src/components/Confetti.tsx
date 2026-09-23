interface Props {
  colors: string[];
  count?: number;
}

/** Lett CSS-konfetti (deterministisk plassering — ingen tilfeldighet i render). */
export default function Confetti({ colors, count = 28 }: Props) {
  const pieces = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 7) * 0.08;
        const dur = 1.6 + ((i * 13) % 10) / 10;
        const c = colors[i % colors.length];
        const rot = (i * 47) % 360;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: c,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              transform: `rotate(${rot}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
