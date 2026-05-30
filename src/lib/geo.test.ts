import { describe, expect, it } from "vitest";
import { averageSamples, combinedAccuracy, haversineMeters, nearestDistance } from "./geo";
import { DISTANCES } from "../types";

describe("haversineMeters", () => {
  it("samme punkt = 0 m", () => {
    expect(haversineMeters({ lat: 59.9, lng: 10.7 }, { lat: 59.9, lng: 10.7 })).toBeCloseTo(0, 5);
  });

  it("~111 m for 0,001° breddegrad", () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("~33 m for 0,0003° breddegrad (typisk utslag-skala)", () => {
    const d = haversineMeters({ lat: 59.9, lng: 10.7 }, { lat: 59.9003, lng: 10.7 });
    expect(d).toBeGreaterThan(31);
    expect(d).toBeLessThan(35);
  });

  it("symmetrisk", () => {
    const a = { lat: 59.9, lng: 10.7 };
    const b = { lat: 59.9005, lng: 10.7008 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("nearestDistance", () => {
  it("velger nærmeste standard-utslag", () => {
    expect(nearestDistance(32, DISTANCES)).toBe(30);
    expect(nearestDistance(8, DISTANCES)).toBe(10);
    expect(nearestDistance(63, DISTANCES)).toBe(75); // 12 < 13
    expect(nearestDistance(120, DISTANCES)).toBe(100);
  });
});

describe("combinedAccuracy", () => {
  it("kvadratisk sum av to usikkerheter", () => {
    expect(combinedAccuracy(3, 4)).toBe(5);
    expect(combinedAccuracy(6, 8)).toBe(10);
    expect(combinedAccuracy(undefined, undefined)).toBe(0);
  });
});

describe("averageSamples", () => {
  it("tomt inn = null", () => {
    expect(averageSamples([])).toBeNull();
  });

  it("vekter mot prøver med best nøyaktighet", () => {
    const avg = averageSamples([
      { lat: 0, lng: 0, accuracy: 2 },
      { lat: 1, lng: 1, accuracy: 20 },
    ]);
    // Den nøyaktige prøven (acc 2) dominerer → snittet ligger nær 0.
    expect(avg!.lat).toBeLessThan(0.1);
    expect(avg!.lng).toBeLessThan(0.1);
    expect(avg!.accuracy).toBe(2);
  });
});
