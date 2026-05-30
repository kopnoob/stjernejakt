import { describe, expect, it } from "vitest";
import { earnedBadges, newlyUnlocked } from "./badges";
import { DISTANCES } from "../types";
import type { Round, Star } from "../types";

let seq = 0;
function mk(star: Star, distance = 30, hcp = 5, day = "2026-05-01"): Round {
  seq += 1;
  return {
    id: `r${seq}`,
    player_id: "p1",
    hcp,
    distance,
    star,
    holed_count: star === "gold" ? 3 : 1,
    total_strokes: 9,
    holes: [],
    created_at: `${day}T10:0${seq % 10}:00.000Z`,
  };
}

describe("earnedBadges", () => {
  it("ingen merker uten gull", () => {
    const e = earnedBadges([mk("silver"), mk("bronze")]);
    expect(e.size).toBe(0);
  });

  it("første gull låser «first-gold»", () => {
    const e = earnedBadges([mk("gold")]);
    expect(e.has("first-gold")).toBe(true);
    expect(e.has("ten-gold")).toBe(false);
  });

  it("10 gull låser «ten-gold»", () => {
    const e = earnedBadges(Array.from({ length: 10 }, () => mk("gold", 30, 5, "2026-05-02")));
    expect(e.has("ten-gold")).toBe(true);
  });

  it("gull på alle sju utslag i ett hcp låser «hcp-complete»", () => {
    const rounds = DISTANCES.map((d) => mk("gold", d, 4, `2026-05-1${DISTANCES.indexOf(d)}`));
    const e = earnedBadges(rounds);
    expect(e.has("hcp-complete")).toBe(true);
  });

  it("ufullstendig hcp gir ikke «hcp-complete»", () => {
    const rounds = DISTANCES.slice(0, 6).map((d) => mk("gold", d, 4));
    const e = earnedBadges(rounds);
    expect(e.has("hcp-complete")).toBe(false);
  });

  it("tre gull samme dag låser «hat-trick»", () => {
    const e = earnedBadges([
      mk("gold", 10, 5, "2026-05-03"),
      mk("gold", 20, 5, "2026-05-03"),
      mk("gold", 30, 5, "2026-05-03"),
    ]);
    expect(e.has("hat-trick")).toBe(true);
  });

  it("tre gull på ulike dager gir ikke «hat-trick»", () => {
    const e = earnedBadges([
      mk("gold", 10, 5, "2026-05-04"),
      mk("gold", 20, 5, "2026-05-05"),
      mk("gold", 30, 5, "2026-05-06"),
    ]);
    expect(e.has("hat-trick")).toBe(false);
  });
});

describe("newlyUnlocked", () => {
  it("returnerer kun merker som krysset terskelen", () => {
    const before = [mk("silver")];
    const newRound = mk("gold");
    const got = newlyUnlocked(before, [...before, newRound]);
    expect(got.map((b) => b.id)).toEqual(["first-gold"]);
  });

  it("returnerer tomt når ingen ny terskel ble nådd", () => {
    const before = [mk("gold"), mk("silver")];
    const after = [...before, mk("bronze")];
    expect(newlyUnlocked(before, after)).toEqual([]);
  });
});
