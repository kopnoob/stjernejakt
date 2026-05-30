import { useMemo, useState } from "react";
import StarIcon from "../components/StarIcon";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import { buildMatrix, hcpProgress, nextHcpDown } from "../rules";
import type { Player, Round, Star } from "../types";
import { DISTANCES, DISTANCE_COLOR, HCP_RANGE, MAX_STARS_PER_HCP } from "../types";
import { buildDiploma, shareDiploma } from "../lib/diploma";

interface Props {
  player: Player;
  rounds: Round[];
  currentHcp: number;
  onBack: () => void;
  onStart: (hcp: number, distance: number) => void;
  onSetHcp: (hcp: number) => void;
  onDelete: () => void;
  onShareAccess: () => Promise<string | null>;
}

type Mode = "journey" | "overview" | "history";

export default function PlayerBoard({ player, rounds, currentHcp, onBack, onStart, onSetHcp, onDelete, onShareAccess }: Props) {
  const [mode, setMode] = useState<Mode>("journey");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [switchHcp, setSwitchHcp] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessLink, setAccessLink] = useState<string | null>(null);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);

  async function shareAccess() {
    setMenuOpen(false);
    setAccessBusy(true);
    setAccessMsg(null);
    const link = await onShareAccess();
    setAccessBusy(false);
    if (!link) {
      setAccessLink(null);
      setAccessMsg("Kunne ikke lage lenke. Er du på nett?");
      return;
    }
    setAccessLink(link);
    const nav = navigator as Navigator & { canShare?: (d: { url: string }) => boolean };
    if (navigator.share && (nav.canShare?.({ url: link }) ?? true)) {
      try {
        await navigator.share({ title: `${player.name} – Stjernejakt`, url: link });
      } catch {
        /* bruker avbrøt — lenken vises uansett under */
      }
    }
  }

  async function copyLink() {
    if (!accessLink) return;
    try {
      await navigator.clipboard.writeText(accessLink);
      setAccessMsg("Lenke kopiert ✓");
    } catch {
      setAccessMsg("Kopier lenken manuelt nedenfor.");
    }
  }

  const playerRounds = useMemo(
    () => rounds.filter((r) => r.player_id === player.id),
    [rounds, player.id],
  );

  const hcp = currentHcp;
  const prog = useMemo(() => hcpProgress(playerRounds, hcp), [playerRounds, hcp]);
  const downHcp = nextHcpDown(hcp);

  // Hvilke hcp er ferdig (alle 7 gull) — vises i hcp-velgeren.
  const completedHcps = useMemo(() => {
    const set = new Set<number>();
    for (const h of HCP_RANGE) if (hcpProgress(playerRounds, h).completed) set.add(h);
    return set;
  }, [playerRounds]);

  // C1: lag + del diplom for nåværende fremgang i dette hcp-et.
  async function shareDiplomaNow() {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await buildDiploma({
        name: player.name,
        avatar: player.avatar ?? null,
        color: player.color,
        hcp,
        goldCount: prog.goldCount,
        starPoints: prog.starPoints,
        maxPoints: MAX_STARS_PER_HCP,
        completed: prog.completed,
        dateLabel: new Date().toLocaleDateString("nb-NO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        starsByDistance: DISTANCES.map((d) => ({
          distance: d,
          star: prog.bestStarByDistance[d] ?? "none",
        })),
      });
      await shareDiploma(blob, player.name);
    } catch (e) {
      console.error("[diplom] feilet", e);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Tilbake">
          <Icon name="back" size={22} />
        </button>
        <span className="topbar-title">
          <span className="avatar-mini" style={{ background: player.color }}>
            {player.avatar || player.name.charAt(0).toUpperCase()}
          </span>
          {player.name}
        </span>
        <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Mer">
          {accessBusy ? <span className="mini-spin" /> : <Icon name="more" size={22} />}
        </button>
      </header>

      {/* Hcp-fokus-kort */}
      <div className="hcp-card">
        <div className="hcp-card-top">
          <div className="hcp-badge">
            <span className="hcp-badge-label">Handicap</span>
            <span className="hcp-badge-num">{hcp}</span>
          </div>
          <div className="hcp-card-prog">
            <div className="hcp-prog-line">
              <strong className="tabnum">{prog.goldCount}/7</strong> gull
              <button className="hcp-switch-btn" onClick={() => setSwitchHcp((v) => !v)}>
                Bytt {switchHcp ? "▴" : "▾"}
              </button>
            </div>
            {/* A2: stjernepoeng (gull=3, sølv=2, bronse=1) belønner delprestasjon —
                stolpen fylles også av bronse/sølv, ikke bare gull. */}
            <div className="progress">
              <div
                className={`progress-fill ${prog.completed ? "gold" : ""}`}
                style={{ width: `${(prog.starPoints / MAX_STARS_PER_HCP) * 100}%` }}
              />
            </div>
            <span className="hcp-points muted tabnum">{prog.starPoints} av {MAX_STARS_PER_HCP} stjernepoeng</span>
          </div>
        </div>

        {switchHcp && (
          <div className="hcp-switch-row">
            {HCP_RANGE.map((h) => (
              <button
                key={h}
                className={`chip ${h === hcp ? "is-active" : ""} ${completedHcps.has(h) ? "is-done" : ""}`}
                onClick={() => {
                  onSetHcp(h);
                  setSwitchHcp(false);
                }}
              >
                {h}
                {completedHcps.has(h) && <span className="chip-done-dot">★</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reise / oversikt / historikk */}
      <div className="mode-toggle">
        <button className={mode === "journey" ? "is-on" : ""} onClick={() => setMode("journey")}>
          Reise
        </button>
        <button className={mode === "overview" ? "is-on" : ""} onClick={() => setMode("overview")}>
          Oversikt
        </button>
        <button className={mode === "history" ? "is-on" : ""} onClick={() => setMode("history")}>
          Historikk
        </button>
      </div>

      {mode === "journey" && (
        <Journey
          hcp={hcp}
          prog={prog}
          downHcp={downHcp}
          onStart={(d) => onStart(hcp, d)}
          onGoDown={() => downHcp && onSetHcp(downHcp)}
        />
      )}
      {mode === "overview" && (
        <OverviewGrid playerRounds={playerRounds} currentHcp={hcp} onStart={onStart} />
      )}
      {mode === "history" && <History rounds={playerRounds} />}

      {/* C1: del diplom */}
      <button className="btn btn-ghost btn-share" onClick={shareDiplomaNow} disabled={sharing}>
        <Icon name="share" size={18} />
        {sharing ? "Lager diplom …" : "Del diplom"}
      </button>

      {menuOpen && (
        <Modal onClose={() => setMenuOpen(false)} labelledBy="menu-title">
          <p className="sheet-title" id="menu-title">
            {player.name}
          </p>
          <div className="menu-actions">
            <button className="btn btn-ghost menu-action" onClick={shareAccess}>
              <Icon name="share" size={18} /> Del tilgang
            </button>
            <button
              className="btn btn-ghost menu-action menu-danger"
              onClick={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
            >
              Skjul på denne enheten
            </button>
          </div>
          <p className="muted menu-hint">
            «Del tilgang» lager en lenke så en annen forelder kan se og legge til
            resultater for {player.name} på sin egen enhet.
          </p>
        </Modal>
      )}

      {accessLink !== null && (
        <Modal onClose={() => setAccessLink(null)} labelledBy="share-title">
          <p className="sheet-title" id="share-title">
            Del tilgang til {player.name}
          </p>
          <p className="muted">
            Send denne lenken til den andre forelderen. Når de åpner den får de
            tilgang til {player.name} på sin enhet.
          </p>
          <div className="share-link tabnum">{accessLink}</div>
          <button className="btn btn-primary" onClick={copyLink}>
            Kopier lenke
          </button>
          {accessMsg && <p className="profile-msg">{accessMsg}</p>}
        </Modal>
      )}

      {accessMsg && accessLink === null && !menuOpen && (
        <Modal onClose={() => setAccessMsg(null)} labelledBy="share-err">
          <p className="sheet-title" id="share-err">
            Deling
          </p>
          <p className="muted">{accessMsg}</p>
          <button className="btn btn-primary" onClick={() => setAccessMsg(null)}>
            OK
          </button>
        </Modal>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)} labelledBy="delete-title">
          <p className="sheet-title" id="delete-title">
            Skjul {player.name}?
          </p>
          <p className="muted">
            {player.name} skjules på denne enheten. Dataene blir liggende trygt og
            kan hentes tilbake (også via deling/gjenoppretting).
          </p>
          <div className="add-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
              Avbryt
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Skjul
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reise: de 7 utslagene som en sti ─────────────────────────────────────

function Journey({
  hcp,
  prog,
  downHcp,
  onStart,
  onGoDown,
}: {
  hcp: number;
  prog: ReturnType<typeof hcpProgress>;
  downHcp: number | null;
  onStart: (distance: number) => void;
  onGoDown: () => void;
}) {
  return (
    <>
      {prog.completed && (
        <div className="complete-banner">
          <div className="complete-emoji">🎉</div>
          <div className="complete-text">
            <strong>Handicap {hcp} fullført!</strong>
            <span className="muted">Gull på alle utslag.</span>
          </div>
          {downHcp ? (
            <button className="btn btn-primary" onClick={onGoDown}>
              Gå videre til handicap {downHcp} →
            </button>
          ) : (
            <p className="muted" style={{ textAlign: "center" }}>
              🏆 Du har fullført det hardeste handicapet!
            </p>
          )}
        </div>
      )}

      <div className="journey">
        {DISTANCES.map((d) => {
          const star: Star = prog.bestStarByDistance[d] ?? "none";
          const pr = prog.bestGoldStrokesByDistance[d];
          const isNext = d === prog.nextDistance;
          const isFuture = prog.nextDistance !== null && d > prog.nextDistance && star === "none";
          return (
            <button
              key={d}
              className={`step ${isNext ? "is-next" : ""} ${star === "gold" ? "is-gold" : ""} ${
                isFuture ? "is-future" : ""
              }`}
              onClick={() => onStart(d)}
            >
              <span className="step-cone" style={{ background: DISTANCE_COLOR[d] }} />
              <span className="step-dist">{d} m</span>
              <span className="step-mid">
                {isNext && <span className="next-tag">Neste</span>}
                {isNext && star !== "none" && <StarIcon variant={star} size={18} outline={false} />}
                {/* A4: vis personlig rekord på fullførte gull-utslag. */}
                {!isNext && star === "gold" && pr != null ? (
                  <span className="step-pr">🏆 rekord {pr} slag</span>
                ) : (
                  !isNext && <span className="step-star-label muted">{starLabel(star)}</span>
                )}
              </span>
              <span className="step-right">
                {isNext ? (
                  <span className="step-play">Spill ▶</span>
                ) : star !== "none" ? (
                  <StarIcon variant={star} size={26} outline={false} />
                ) : (
                  <span className="cell-dash">·</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Oversikt: full matrise (sekundær) ─────────────────────────────────────

function OverviewGrid({
  playerRounds,
  currentHcp,
  onStart,
}: {
  playerRounds: Round[];
  currentHcp: number;
  onStart: (hcp: number, distance: number) => void;
}) {
  const matrix = useMemo(() => buildMatrix(playerRounds), [playerRounds]);
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner" />
            {HCP_RANGE.map((h) => (
              <th key={h} className={h === currentHcp ? "hcp-current" : ""}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DISTANCES.map((d) => (
            <tr key={d}>
              <th className="dist-label">
                <span className="cone" style={{ background: DISTANCE_COLOR[d] }} />
                {d}
              </th>
              {HCP_RANGE.map((h) => {
                const best: Star = matrix.get(`${h}:${d}`)?.best ?? "none";
                return (
                  <td key={h}>
                    <button
                      className={`cell star-${best}`}
                      onClick={() => onStart(h, d)}
                      aria-label={`Hcp ${h}, ${d} meter${best !== "none" ? `, beste: ${best}` : ""}`}
                    >
                      {best === "none" ? (
                        <span className="cell-dash">·</span>
                      ) : (
                        <StarIcon variant={best} size={18} outline={false} />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Historikk: tidslinje av runder (C3) ───────────────────────────────────

function History({ rounds }: { rounds: Round[] }) {
  // Nyeste først.
  const sorted = useMemo(
    () => [...rounds].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rounds],
  );

  if (sorted.length === 0) {
    return (
      <div className="empty history-empty">
        <p>Ingen runder ennå.</p>
        <p className="muted">Spill en runde så dukker den opp her – nyeste øverst.</p>
      </div>
    );
  }

  // Gruppér på dato (lokal).
  const groups: { day: string; items: Round[] }[] = [];
  for (const r of sorted) {
    const day = formatDay(r.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(r);
    else groups.push({ day, items: [r] });
  }

  return (
    <div className="history">
      {groups.map((g) => (
        <div key={g.day} className="history-group">
          <div className="history-day muted">{g.day}</div>
          {g.items.map((r) => (
            <div key={r.id} className="history-row">
              <span className="history-cone" style={{ background: DISTANCE_COLOR[r.distance] }} />
              <span className="history-dist">{r.distance} m</span>
              <span className="history-hcp muted">hcp {r.hcp}</span>
              <span className="history-detail muted tabnum">
                {r.holed_count}/3 i mål · {r.total_strokes} slag
              </span>
              <span className="history-star">
                {r.star === "none" ? (
                  <span className="cell-dash">·</span>
                ) : (
                  <StarIcon variant={r.star} size={22} outline={false} />
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Tidligere";
  return d.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" });
}

function starLabel(star: Star): string {
  switch (star) {
    case "gold":
      return "Gull";
    case "silver":
      return "Sølv";
    case "bronze":
      return "Bronse";
    default:
      return "Ikke spilt";
  }
}
