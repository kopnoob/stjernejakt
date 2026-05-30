// Robust PWA-oppdatering.
//
// Standard-registreringen fra vite-plugin-pwa registrerer bare service
// workeren — den sjekker verken etter nye versjoner jevnlig eller laster siden
// på nytt når en ny worker tar over. På iOS-hjemskjerm (der appen sjelden
// sjekker selv) gjør det at man kan sitte fast på en gammel versjon.
//
// Service workeren bygges med skipWaiting + clientsClaim (registerType:
// autoUpdate), så en ny worker aktiveres umiddelbart. Vi trenger bare å:
//   1) tvinge en oppdaterings-sjekk når appen åpnes/får fokus (+ periodisk)
//   2) laste siden på nytt når den nye workeren faktisk tar kontroll.

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
        const check = () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        };
        check(); // sjekk med en gang
        document.addEventListener("visibilitychange", check); // ved forgrunn (iOS)
        window.addEventListener("focus", check);
        setInterval(check, 60 * 60 * 1000); // sikkerhetsnett hver time
      })
      .catch(() => {
        /* offline ved første åpning — registreres ved neste besøk */
      });
  });
}
