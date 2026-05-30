// GPS-avstand: rene hjelpere (ingen DOM). Brukes av måle-modalen for å regne
// avstand mellom hull og utslag, dempe støy ved å midle prøver, og finne
// nærmeste standard-utslag. Selve posisjons-abonnementet (watchPosition) bor i
// komponenten.

export interface LatLng {
  lat: number;
  lng: number;
  /** Nøyaktighet (meter) fra Geolocation API, hvis kjent. */
  accuracy?: number;
}

/** Avstand i meter mellom to koordinater (Haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371008.8; // jordas middelradius (m)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nærmeste verdi i `distances` til `meters`. */
export function nearestDistance(meters: number, distances: number[]): number {
  return distances.reduce(
    (best, d) => (Math.abs(d - meters) < Math.abs(best - meters) ? d : best),
    distances[0],
  );
}

/** Kombinert usikkerhet (m) for en avstandsmåling fra to punkters nøyaktighet. */
export function combinedAccuracy(a?: number, b?: number): number {
  return Math.round(Math.hypot(a ?? 0, b ?? 0));
}

/**
 * Vektet snitt av posisjonsprøver (vekt = 1/nøyaktighet²) for å dempe støy ved
 * markering av hullet. Returnerer beste (minste) nøyaktighet blant prøvene.
 */
export function averageSamples(samples: LatLng[]): LatLng | null {
  if (!samples.length) return null;
  let wsum = 0;
  let lat = 0;
  let lng = 0;
  let bestAcc = Infinity;
  for (const s of samples) {
    const acc = s.accuracy && s.accuracy > 0 ? s.accuracy : 10;
    const w = 1 / (acc * acc);
    wsum += w;
    lat += s.lat * w;
    lng += s.lng * w;
    if (acc < bestAcc) bestAcc = acc;
  }
  return { lat: lat / wsum, lng: lng / wsum, accuracy: bestAcc === Infinity ? undefined : bestAcc };
}

export function geolocationAvailable(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}
