// Liten haptisk kvittering ved inntasting. No-op der vibrate ikke støttes
// (bl.a. iOS Safari) — der bærer den visuelle tall-poppen kvitteringen.
export function haptic(ms: number | number[] = 8): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignorer */
  }
}
