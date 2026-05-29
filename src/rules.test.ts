import { describe, expect, it } from "vitest";
import { buildMatrix, evaluateRound, hcpProgress, holeStatus, nextHcpDown, totalStars } from "./rules";
import type { HoleResult, Round } from "./types";

// Hjelpere for å lage hull kort.
const holed = (n: number): HoleResult => ({ strokes: n, pickedUp: false });
const pickup = (n = 0): HoleResult => ({ strokes: n, pickedUp: true });

describe("holeStatus", () => {
  it("i mål når slag ≤ hcp", () => {
    expect(holeStatus(holed(3), 5)).toBe("holed");
    expect(holeStatus(holed(5), 5)).toBe("holed");
  });
  it("over par når slag > hcp", () => {
    expect(holeStatus(holed(6), 5)).toBe("over_par");
  });
  it("plukket opp = failed uansett slag", () => {
    expect(holeStatus(pickup(7), 5)).toBe("failed");
    expect(holeStatus(pickup(0), 5)).toBe("failed");
  });
});

describe("evaluateRound — hovedregel (antall hull i mål)", () => {
  it("3 hull i mål → gull", () => {
    const r = evaluateRound([holed(2), holed(3), holed(4)], 5, 30);
    expect(r.holedCount).toBe(3);
    expect(r.star).toBe("gold");
  });
  it("2 hull i mål, over threshold → sølv", () => {
    // hcp 5 → threshold 15. To i mål (4+5), tredje over par 8 = total 17 > 15.
    const r = evaluateRound([holed(4), holed(5), holed(8)], 5, 30);
    expect(r.holedCount).toBe(2);
    expect(r.star).toBe("silver");
  });
  it("1 hull i mål → bronse", () => {
    const r = evaluateRound([holed(4), holed(8), holed(9)], 5, 30);
    expect(r.holedCount).toBe(1);
    expect(r.star).toBe("bronze");
  });
  it("0 hull i mål → ingen stjerne", () => {
    const r = evaluateRound([holed(8), holed(9), holed(10)], 5, 30);
    expect(r.star).toBe("none");
  });
});

describe("evaluateRound — tilleggsregel (total ≤ 3×hcp)", () => {
  it("brukerens case: 2 i mål + 1 over par, total = 3×hcp → gull", () => {
    // Hull 1 over par (7), hull 2+3 i mål (4+4). Total 15 = 3×5. Ingen pickup.
    const r = evaluateRound([holed(7), holed(4), holed(4)], 5, 30);
    expect(r.holedCount).toBe(2);
    expect(r.totalStrokes).toBe(15);
    expect(r.anyPickedUp).toBe(false);
    expect(r.star).toBe("gold");
  });
  it("akkurat over threshold → ikke gull via total", () => {
    const r = evaluateRound([holed(7), holed(4), holed(5)], 5, 30); // 16 > 15
    expect(r.star).toBe("silver"); // 2 i mål
  });
});

describe("evaluateRound — plukk opp blokkerer 3×hcp-gull", () => {
  it("plukket opp på ett hull → ingen gull via total, selv om total ≤ 3×hcp", () => {
    // 2 i mål (4+4 = 8 ≤ 15), men hull 1 plukket opp. Skal bli SØLV, ikke gull.
    const r = evaluateRound([pickup(3), holed(4), holed(4)], 5, 30);
    expect(r.anyPickedUp).toBe(true);
    expect(r.holedCount).toBe(2);
    expect(r.star).toBe("silver");
  });
  it("alle 3 i mål gir fortsatt gull selv om total er høy (hovedregel)", () => {
    const r = evaluateRound([holed(5), holed(5), holed(5)], 5, 30); // 15, alle i mål
    expect(r.star).toBe("gold");
  });
  it("plukket opp + 1 i mål → bronse", () => {
    const r = evaluateRound([holed(3), pickup(4), pickup(2)], 5, 30);
    expect(r.holedCount).toBe(1);
    expect(r.star).toBe("bronze");
  });
});

describe("evaluateRound — opprykk", () => {
  it("gull på 100 m → promoted", () => {
    const r = evaluateRound([holed(2), holed(2), holed(2)], 5, 100);
    expect(r.promoted).toBe(true);
  });
  it("gull på 30 m → ikke promoted", () => {
    const r = evaluateRound([holed(2), holed(2), holed(2)], 5, 30);
    expect(r.promoted).toBe(false);
  });
});

describe("matrise og totalsum", () => {
  const mk = (hcp: number, distance: number, star: Round["star"], total = 10): Round => ({
    id: Math.random().toString(),
    player_id: "p1",
    hcp,
    distance,
    star,
    holed_count: 0,
    total_strokes: total,
    holes: [],
    created_at: new Date().toISOString(),
  });

  it("beste stjerne pr celle vinner", () => {
    const cells = buildMatrix([mk(5, 30, "bronze"), mk(5, 30, "gold"), mk(5, 30, "silver")]);
    expect(cells.get("5:30")?.best).toBe("gold");
  });
  it("totalStars summerer beste pr celle (gull=3, sølv=2, bronse=1)", () => {
    const rounds = [mk(5, 30, "gold"), mk(5, 40, "silver"), mk(4, 30, "bronze")];
    expect(totalStars(rounds)).toBe(3 + 2 + 1);
  });
  it("gjentatte runder på samme celle teller bare beste én gang", () => {
    const rounds = [mk(5, 30, "gold"), mk(5, 30, "gold"), mk(5, 30, "silver")];
    expect(totalStars(rounds)).toBe(3);
  });
});

describe("hcpProgress — fokusert reise", () => {
  const mk = (hcp: number, distance: number, star: Round["star"]): Round => ({
    id: Math.random().toString(),
    player_id: "p1",
    hcp,
    distance,
    star,
    holed_count: 0,
    total_strokes: 10,
    holes: [],
    created_at: new Date().toISOString(),
  });

  it("ingen runder → neste er 10m, 0 gull", () => {
    const p = hcpProgress([], 5);
    expect(p.goldCount).toBe(0);
    expect(p.nextDistance).toBe(10);
    expect(p.completed).toBe(false);
  });
  it("gull på 10 og 20 → neste er 30m", () => {
    const p = hcpProgress([mk(5, 10, "gold"), mk(5, 20, "gold")], 5);
    expect(p.goldCount).toBe(2);
    expect(p.nextDistance).toBe(30);
  });
  it("sølv på 10 (ikke gull) → 10m er fortsatt neste", () => {
    const p = hcpProgress([mk(5, 10, "silver")], 5);
    expect(p.goldCount).toBe(0);
    expect(p.nextDistance).toBe(10);
    expect(p.bestStarByDistance[10]).toBe("silver");
  });
  it("runder på annet hcp teller ikke", () => {
    const p = hcpProgress([mk(4, 10, "gold"), mk(4, 20, "gold")], 5);
    expect(p.goldCount).toBe(0);
    expect(p.nextDistance).toBe(10);
  });
  it("gull på alle 7 → completed, ingen neste", () => {
    const rounds = [10, 20, 30, 40, 50, 75, 100].map((d) => mk(5, d, "gold"));
    const p = hcpProgress(rounds, 5);
    expect(p.goldCount).toBe(7);
    expect(p.completed).toBe(true);
    expect(p.nextDistance).toBe(null);
  });
});

describe("nextHcpDown", () => {
  it("5 → 4", () => expect(nextHcpDown(5)).toBe(4));
  it("2 (hardeste) → null", () => expect(nextHcpDown(2)).toBe(null));
});

describe("evaluateRound — allReached / missedGoldBy (A3 nesten i mål)", () => {
  it("alle hull fullført (ingen pickup) → allReached=true", () => {
    const r = evaluateRound([holed(6), holed(6), holed(6)], 5, 30);
    expect(r.allReached).toBe(true);
  });
  it("plukket opp → allReached=false", () => {
    const r = evaluateRound([holed(6), pickup(2), holed(6)], 5, 30);
    expect(r.allReached).toBe(false);
  });
  it("nesten gull via total: 16 mot terskel 15 → missedGoldBy=1", () => {
    // Ingen i mål-gull (0 holed under hcp? faktisk 7>5 alle over par), total 18..
    // Konstruer: alle over par men fullført, total 16, terskel 15.
    const r = evaluateRound([holed(6), holed(5), holed(5)], 5, 30); // 16, 1 holed
    expect(r.allReached).toBe(true);
    expect(r.threshold).toBe(15);
    expect(r.missedGoldBy).toBe(1);
  });
  it("gull → missedGoldBy=null", () => {
    const r = evaluateRound([holed(5), holed(5), holed(5)], 5, 30);
    expect(r.star).toBe("gold");
    expect(r.missedGoldBy).toBe(null);
  });
  it("plukket opp → missedGoldBy=null (ikke relevant)", () => {
    const r = evaluateRound([pickup(2), holed(5), holed(5)], 5, 30);
    expect(r.missedGoldBy).toBe(null);
  });
});

describe("evaluateRound — saniterer slagtall", () => {
  it("negative og ikke-endelige slag teller som 0", () => {
    const r = evaluateRound(
      [{ strokes: -3, pickedUp: false }, { strokes: NaN, pickedUp: false }, holed(4)],
      5,
      30,
    );
    expect(r.totalStrokes).toBe(4);
  });
  it("urimelig høye slag klippes til 50", () => {
    const r = evaluateRound([{ strokes: 9999, pickedUp: false }, holed(0), holed(0)], 5, 30);
    expect(r.totalStrokes).toBe(50);
  });
});

describe("hcpProgress — starPoints (A2 delprestasjon)", () => {
  const mk = (hcp: number, distance: number, star: Round["star"], total = 10): Round => ({
    id: Math.random().toString(),
    player_id: "p1",
    hcp,
    distance,
    star,
    holed_count: 0,
    total_strokes: total,
    holes: [],
    created_at: new Date().toISOString(),
  });

  it("summerer poeng (gull=3, sølv=2, bronse=1) for hcp-et", () => {
    const p = hcpProgress([mk(5, 10, "gold"), mk(5, 20, "silver"), mk(5, 30, "bronze")], 5);
    expect(p.starPoints).toBe(3 + 2 + 1);
  });
  it("teller kun beste pr utslag", () => {
    const p = hcpProgress([mk(5, 10, "bronze"), mk(5, 10, "gold")], 5);
    expect(p.starPoints).toBe(3);
  });
  it("alle 7 gull → 21 poeng", () => {
    const rounds = [10, 20, 30, 40, 50, 75, 100].map((d) => mk(5, d, "gold"));
    expect(hcpProgress(rounds, 5).starPoints).toBe(21);
  });
});

describe("hcpProgress — bestGoldStrokesByDistance (A4 personlig rekord)", () => {
  const mk = (distance: number, star: Round["star"], total: number): Round => ({
    id: Math.random().toString(),
    player_id: "p1",
    hcp: 5,
    distance,
    star,
    holed_count: 0,
    total_strokes: total,
    holes: [],
    created_at: new Date().toISOString(),
  });

  it("beste (færreste) gull-score pr utslag huskes", () => {
    const p = hcpProgress([mk(10, "gold", 14), mk(10, "gold", 11), mk(10, "gold", 13)], 5);
    expect(p.bestGoldStrokesByDistance[10]).toBe(11);
  });
  it("ikke-gull runder gir ingen rekord", () => {
    const p = hcpProgress([mk(10, "silver", 8)], 5);
    expect(p.bestGoldStrokesByDistance[10]).toBe(null);
  });
});

describe("buildMatrix — bestGoldStrokes pr celle", () => {
  const mk = (star: Round["star"], total: number): Round => ({
    id: Math.random().toString(),
    player_id: "p1",
    hcp: 5,
    distance: 30,
    star,
    holed_count: 0,
    total_strokes: total,
    holes: [],
    created_at: new Date().toISOString(),
  });
  it("færreste slag blant gull-runder", () => {
    const cells = buildMatrix([mk("gold", 14), mk("silver", 9), mk("gold", 12)]);
    expect(cells.get("5:30")?.bestGoldStrokes).toBe(12);
  });
});
