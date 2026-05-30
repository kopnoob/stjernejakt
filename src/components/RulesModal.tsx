import Modal from "./Modal";
import StarIcon from "./StarIcon";
import { DISTANCES, HCP_RANGE } from "../types";

/** Kort regel-oversikt for Stjernejakt — hjelper nye brukere i gang. */
export default function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} labelledBy="rules-title" className="rules-sheet">
      <p className="sheet-title" id="rules-title">
        Slik fungerer Stjernejakt
      </p>

      <div className="rules-block">
        <span className="rules-emoji" aria-hidden="true">🎯</span>
        <div>
          <strong>Målet</strong>
          <p className="muted">
            Du skal <em>ikke</em> i selve hullet — men innenfor en <strong>ring rundt hullet</strong>,
            en sirkel på ca. <strong>1 m i diameter</strong> (altså innenfor ca. 0,5 m fra hullet).
            Ballen er «i mål» når den stopper inni ringen.
          </p>
        </div>
      </div>

      <div className="rules-block">
        <span className="rules-emoji" aria-hidden="true">⛳</span>
        <div>
          <strong>En runde</strong>
          <p className="muted">
            Velg <strong>utslag</strong> ({DISTANCES[0]}–{DISTANCES[DISTANCES.length - 1]} m) og{" "}
            <strong>handicap</strong> ({HCP_RANGE[0]}–{HCP_RANGE[HCP_RANGE.length - 1]}, hvor mange
            slag du har på deg). Spill <strong>3 hull</strong>. Tast antall slag med + / −, eller
            «Plukk opp» om du gir deg. Et hull er <strong>i mål</strong> hvis ballen nådde ringen
            innen handicap-slag.
          </p>
        </div>
      </div>

      <div className="rules-block">
        <span className="rules-emoji" aria-hidden="true">⭐</span>
        <div>
          <strong>Stjernene</strong>
          <ul className="rules-stars">
            <li>
              <StarIcon variant="bronze" size={20} outline={false} /> 1 hull i mål → bronse
            </li>
            <li>
              <StarIcon variant="silver" size={20} outline={false} /> 2 hull i mål → sølv
            </li>
            <li>
              <StarIcon variant="gold" size={20} outline={false} /> 3 hull i mål → gull
            </li>
          </ul>
          <p className="muted">
            I tillegg: <strong>gull</strong> hvis du brukte <strong>≤ 3 × handicap</strong> slag
            totalt — men ikke hvis du plukket opp et hull.
          </p>
        </div>
      </div>

      <div className="rules-block">
        <span className="rules-emoji" aria-hidden="true">🏆</span>
        <div>
          <strong>Reisen</strong>
          <p className="muted">
            Start på 10 m. Klarer du gull, går du videre til neste utslag. Gull på alle sju utslag
            → ned til et hardere handicap.
          </p>
        </div>
      </div>

      <button className="btn btn-primary profile-done" onClick={onClose}>
        Skjønner!
      </button>
    </Modal>
  );
}
