interface Props {
  name: "back" | "more" | "share";
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
    </svg>
  );
}
