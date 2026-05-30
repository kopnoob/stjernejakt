interface Props {
  name: "back" | "more" | "share" | "flight" | "trophy";
  size?: number;
}

/** Egne, rene linje-ikoner for app-krom (G3) — ingen emoji i navigasjonen. */
export default function Icon({ name, size = 24 }: Props) {
  if (name === "more") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "back" && <path d="M15 5l-7 7 7 7" />}
      {name === "share" && (
        <>
          <path d="M12 3v12" />
          <path d="M8 7l4-4 4 4" />
          <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
        </>
      )}
      {name === "flight" && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19v-.7c0-2.7 2.4-4.8 5.5-4.8s5.5 2.1 5.5 4.8v.7" />
          <circle cx="17.5" cy="9" r="2.3" />
          <path d="M16 13.4c2.6.1 4.5 1.9 4.5 4.6V19" />
        </>
      )}
      {name === "trophy" && (
        <>
          <path d="M7 4h10v4.5a5 5 0 0 1-10 0V4z" />
          <path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5" />
          <path d="M17 6h2.5v1.5A3 3 0 0 1 16.5 10.5" />
          <path d="M12 13.5V17" />
          <path d="M8.5 20h7" />
          <path d="M9.5 20l.5-3h4l.5 3" />
        </>
      )}
    </svg>
  );
}
