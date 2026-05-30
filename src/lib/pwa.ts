// Robust, automatisk PWA-oppdatering.
//
// Service workeren bygges med skipWaiting + clientsClaim (registerType:
// autoUpdate), så en ny worker aktiveres umiddelbart når den er lastet ned.
// Vi sørger for at den faktisk LASTES ned og at siden friskes opp:
//
//   1) Sjekk etter ny versjon ved «trygge» øyeblikk — når appen åpnes / kommer
//      i forgrunn / får fokus / man navigerer. Det er nettopp da man er på vei
//      INN i et skjermbilde, så en reload er ikke forstyrrende (ingen brå
//      reload midt i en runde-inntasting).
//   2) Når en ny worker tar kontroll → last siden på nytt (én gang).
//
// Resultat: så lenge du er på nett, oppdateres appen av seg selv neste gang du
// åpner den. Ingen manuelle steg etter at du først er på denne versjonen.

export function registerPwa() {
  if (!import.meta.env.PROD) return; // ingen SW i dev
  if (!("serviceWorker" in navigator)) return;

  const base = import.meta.env.BASE_URL; // f.eks. "/stjernejakt/"

  // Last siden på nytt når en ny worker overtar kontrollen (ekte oppdatering).
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        let last = 0;
        const check = () => {
          if (document.visibilityState !== "visible") return;
          const now = Date.now();
          if (now - last < 5000) return; // throttle mot dobbeltsjekk
          last = now;
          reg.update().catch(() => {});
        };
        check(); // sjekk med en gang ved oppstart
        // Trygge øyeblikk: forgrunn (iOS), fokus, og in-app-navigasjon.
        document.addEventListener("visibilitychange", check);
        window.addEventListener("focus", check);
        window.addEventListener("hashchange", check);
      })
      .catch(() => {
        /* offline ved første åpning — registreres ved neste besøk */
      });
  });
}
