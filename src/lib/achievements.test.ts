import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  STEP_NAMES,
  computeBag,
  earnedLabel,
  getAchievement,
  localDayKey,
  nearMisses,
  newlyEarned,
  parseMeters,
  referenceHint,
  seriesWindow,
} from "./achievements";
import { DISTANCES } from "../types";
import type { HoleResult, Round, Star, TrainingEntry, TrainingOutcome } from "../types";

// ─── Hjelpere ───────────────────────────────────────────────────────────────

let seq = 0;
/** Tidspunkt midt på dagen (lokal tid) så dags-grenser ikke blir tvetydige. */
function at(day: string, minute: number): string {
  const d = new Date(`${day}T12:00:00`);
  d.setMinutes(d.getMinutes() + minute);
  return d.toISOString();
}

function attempt(
  badge_id: string,
  opts: Partial<TrainingEntry> & { day?: string; minute?: number } = {},
): TrainingEntry {
  seq += 1;
  const { day = "2026-09-01", minute = seq, ...rest } = opts;
  return {
    id: `e${seq}`,
    player_id: "p1",
    kind: "attempt",
    badge_id,
    step: null,
    outcome: null,
    value_m: null,
    reference_m: null,
    series_id: null,
    award: null,
    note: null,
    created_at: at(day, minute),
    ...rest,
  };
}

function series(
  badge_id: string,
  step: number,
  outcomes: TrainingOutcome[],
  series_id = "s1",
  day = "2026-09-01",
): TrainingEntry[] {
  return outcomes.map((outcome) => attempt(badge_id, { step, outcome, series_id, day }));
}

function round(star: Star, opts: { distance?: number; hcp?: number; day?: string; holes?: HoleResult[] } = {}): Round {
  seq += 1;
  const { distance = 30, hcp = 5, day = "2026-09-01", holes = [] } = opts;
  return {
    id: `r${seq}`,
    player_id: "p1",
    hcp,
    distance,
    star,
    holed_count: star === "gold" ? 3 : 1,
    total_strokes: 9,
    holes,
    created_at: at(day, seq),
  };
}

const level = (entries: TrainingEntry[], id: string, rounds: Round[] = []) =>
  computeBag(rounds, entries).badges[id].level;

// ─── Katalog ────────────────────────────────────────────────────────────────

describe("katalog", () => {
  it("har sju trinn i kjeglefargene", () => {
    expect(STEP_NAMES).toEqual(["grønn", "hvit", "gul", "blå", "oransje", "svart", "rosa"]);
  });

  it("har unike id-er og alle forventede merker", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "rakett", "laser", "blink", "magnet", "plopp", "fjaerlett", "trofast",
      "chip-in", "oppdager", "sta-pa", "drommeslag", "trener",
      "first-gold", "hcp-complete", "ten-gold", "hat-trick",
    ]) {
      expect(getAchievement(id), id).toBeDefined();
    }
  });

  it("hver stige har sju nummererte trinn med tekst", () => {
    for (const a of ACHIEVEMENTS.filter((x) => ["value", "series", "count"].includes(x.kind))) {
      expect(a.steps.map((s) => s.n), a.id).toEqual([1, 2, 3, 4, 5, 6, 7]);
      for (const s of a.steps) expect(s.requirement.length, `${a.id} ${s.n}`).toBeGreaterThan(0);
    }
  });

  it("Rakett måler total lengde", () => {
    const rakett = getAchievement("rakett")!;
    expect(rakett.steps.map((s) => s.threshold)).toEqual([30, 50, 70, 90, 110, 130, 150]);
    expect(rakett.steps[0].requirement).toContain("total");
  });

  it("serie-øvelser har treff- og bom-knapper, Magnet også «I hull!»", () => {
    for (const a of ACHIEVEMENTS.filter((x) => x.kind === "series")) {
      const codes = (a.outcomes ?? []).map((o) => o.code);
      expect(codes, a.id).toContain("hit");
      expect(codes, a.id).toContain("miss");
    }
    expect(getAchievement("magnet")!.outcomes!.map((o) => o.code)).toContain("holed");
  });

  it("Plopp bruker norsk desimalkomma", () => {
    expect(getAchievement("plopp")!.steps[2].requirement).toBe("3 av 5 i hull fra 1,5 m");
  });
});

// ─── Vindu (3 av 5) ─────────────────────────────────────────────────────────

describe("seriesWindow", () => {
  it("teller bare de siste fem", () => {
    expect(seriesWindow(["hit", "hit", "hit", "miss", "miss", "miss", "miss", "hit"])).toEqual({
      successes: 1,
      count: 5,
      passed: false,
    });
  });

  it("tre treff på rad gir bestått med en gang", () => {
    expect(seriesWindow(["hit", "hit", "hit"]).passed).toBe(true);
  });

  it("«holed» teller som treff", () => {
    expect(seriesWindow(["holed", "miss", "hit", "holed"]).passed).toBe(true);
  });
});

// ─── Rakett (ett godt slag holder) ──────────────────────────────────────────

describe("Rakett", () => {
  it("gir alle trinn opp til lengden og husker rekorden", () => {
    const bag = computeBag([], [attempt("rakett", { value_m: 92 })]);
    expect(bag.badges.rakett.level).toBe(4);
    expect(bag.badges.rakett.earned.map((e) => e.step)).toEqual([1, 2, 3, 4]);
    expect(bag.badges.rakett.record).toBe(92);
  });

  it("kortere slag etterpå endrer ingenting", () => {
    const bag = computeBag([], [attempt("rakett", { value_m: 92 }), attempt("rakett", { value_m: 60 })]);
    expect(bag.badges.rakett.level).toBe(4);
    expect(bag.badges.rakett.record).toBe(92);
  });

  it("angret (slettet) registrering teller ikke", () => {
    expect(level([attempt("rakett", { value_m: 92, deleted: true })], "rakett")).toBe(0);
  });
});

// ─── Serier ─────────────────────────────────────────────────────────────────

describe("serier", () => {
  it("tre treff gir trinnet", () => {
    expect(level(series("plopp", 1, ["hit", "hit", "hit"]), "plopp")).toBe(1);
  });

  it("to treff gir ikke trinnet", () => {
    expect(level(series("plopp", 1, ["hit", "miss", "hit"]), "plopp")).toBe(0);
  });

  it("bom nullstiller ikke — de siste fem teller", () => {
    expect(level(series("magnet", 2, ["miss", "miss", "miss", "hit", "hit", "hit"]), "magnet")).toBe(2);
  });

  it("glidende vindu som aldri når tre", () => {
    expect(level(series("plopp", 1, ["hit", "miss", "miss", "hit", "miss", "hit"]), "plopp")).toBe(0);
  });

  it("serier blandes ikke", () => {
    const entries = [...series("plopp", 1, ["hit", "hit"], "a"), ...series("plopp", 1, ["hit"], "b")];
    expect(level(entries, "plopp")).toBe(0);
  });

  it("høyere trinn gir også alle lavere", () => {
    const bag = computeBag([], series("fjaerlett", 4, ["hit", "hit", "hit"]));
    expect(bag.badges.fjaerlett.earned.map((e) => e.step)).toEqual([1, 2, 3, 4]);
  });

  it("husker når trinnet ble tatt (forsøket som fullførte)", () => {
    const entries = series("plopp", 1, ["hit", "miss", "hit", "hit"]);
    const bag = computeBag([], entries);
    expect(bag.badges.plopp.earned[0].at).toBe(entries[3].created_at);
  });

  it("angret forsøk fjerner trinnet igjen", () => {
    const entries = series("plopp", 1, ["hit", "hit", "hit"]);
    entries[2] = { ...entries[2], deleted: true };
    expect(level(entries, "plopp")).toBe(0);
  });
});

// ─── Øyeblikk og Trofast ────────────────────────────────────────────────────

describe("øyeblikk", () => {
  it("Chip-in ved «I hull!» på Magnet, teller antall", () => {
    const bag = computeBag([], series("magnet", 1, ["holed", "miss", "holed"]));
    expect(bag.badges["chip-in"].level).toBe(1);
    expect(bag.badges["chip-in"].count).toBe(2);
    expect(bag.hiddenFound).toBe(1);
  });

  it("Stå-på når trinnet tas etter minst 15 forsøk samme dag", () => {
    const entries = [
      ...series("plopp", 3, Array<TrainingOutcome>(10).fill("miss"), "a"),
      ...series("plopp", 3, ["miss", "miss", "hit", "hit", "hit"], "b"),
    ];
    const bag = computeBag([], entries);
    expect(bag.badges.plopp.level).toBe(3);
    expect(bag.badges["sta-pa"].level).toBe(1);
  });

  it("ingen Stå-på for rask suksess", () => {
    expect(level(series("plopp", 1, ["hit", "hit", "hit"]), "sta-pa")).toBe(0);
  });

  it("Oppdager etter Stjernejakt + range + chipping + putting", () => {
    const entries = [
      attempt("rakett", { value_m: 20 }),
      attempt("magnet", { step: 1, outcome: "miss", series_id: "c" }),
    ];
    expect(level(entries, "oppdager", [round("bronze")])).toBe(0);
    entries.push(attempt("plopp", { step: 1, outcome: "miss", series_id: "p" }));
    expect(level(entries, "oppdager", [round("bronze")])).toBe(1);
    expect(computeBag([round("bronze")], entries).areasTried.sort()).toEqual(
      ["chipping", "putting", "range", "stjernejakt"],
    );
  });

  it("Drømmeslag når et hull fullføres på ett slag", () => {
    const holes: HoleResult[] = [
      { strokes: 1, pickedUp: false },
      { strokes: 3, pickedUp: false },
      { strokes: 4, pickedUp: false },
    ];
    expect(level([], "drommeslag", [round("gold", { holes })])).toBe(1);
  });

  it("Trofast teller ulike dager med runder eller trening", () => {
    const rounds = [round("bronze", { day: "2026-09-01" })];
    const entries = [
      attempt("rakett", { value_m: 20, day: "2026-09-01" }),
      attempt("rakett", { value_m: 20, day: "2026-09-02" }),
    ];
    expect(computeBag(rounds, entries).badges.trofast).toMatchObject({ level: 0, progress: 2 });
    entries.push(attempt("rakett", { value_m: 20, day: "2026-09-05" }));
    const bag = computeBag(rounds, entries);
    expect(bag.badges.trofast).toMatchObject({ level: 1, progress: 3 });
    expect(bag.trainingDays).toBe(3);
  });

  it("trenermerker teller ikke som treningsdager", () => {
    const award = attempt("trener", { kind: "coach", award: "mot", note: "Prøvde 4 m!" });
    const bag = computeBag([], [award]);
    expect(bag.trainingDays).toBe(0);
    expect(bag.badges.trener.count).toBe(1);
    expect(bag.badges.trener.awards?.[0].note).toBe("Prøvde 4 m!");
  });
});

// ─── Stjernejakt-merkene (fra rundene) ──────────────────────────────────────

describe("Stjernejakt-merker", () => {
  it("første gull og 10 gull", () => {
    const one = computeBag([round("gold")], []);
    expect(one.badges["first-gold"].level).toBe(1);
    expect(one.badges["ten-gold"].level).toBe(0);
    const ten = computeBag(Array.from({ length: 10 }, () => round("gold", { day: "2026-09-02" })), []);
    expect(ten.badges["ten-gold"].level).toBe(1);
  });

  it("helt handicap = gull på alle sju utslag i samme hcp", () => {
    const all = DISTANCES.map((d, i) => round("gold", { distance: d, hcp: 4, day: `2026-09-1${i}` }));
    expect(computeBag(all, []).badges["hcp-complete"].level).toBe(1);
    expect(computeBag(all.slice(0, 6), []).badges["hcp-complete"].level).toBe(0);
  });

  it("hat trick = tre gull samme dag", () => {
    const same = ["2026-09-03", "2026-09-03", "2026-09-03"].map((day) => round("gold", { day }));
    const spread = ["2026-09-04", "2026-09-05", "2026-09-06"].map((day) => round("gold", { day }));
    expect(computeBag(same, []).badges["hat-trick"].level).toBe(1);
    expect(computeBag(spread, []).badges["hat-trick"].level).toBe(0);
  });

  it("slettede runder teller ikke", () => {
    expect(computeBag([{ ...round("gold"), deleted: true }], []).badges["first-gold"].level).toBe(0);
  });
});

// ─── Nye merker (til feiringen) ─────────────────────────────────────────────

describe("newlyEarned", () => {
  it("lister nye trinn og øyeblikk mellom før og etter", () => {
    const before = computeBag([], []);
    const entries = [...series("magnet", 2, ["holed", "hit", "hit"])];
    const got = newlyEarned(before, computeBag([], entries));
    expect(got.map((g) => `${g.def.id}:${g.step}`)).toEqual(["magnet:1", "magnet:2", "chip-in:1"]);
  });

  it("gir nye trenermerker med selve registreringen", () => {
    const award = attempt("trener", { kind: "coach", award: "innsats", note: null });
    const got = newlyEarned(computeBag([], []), computeBag([], [award]));
    expect(got).toHaveLength(1);
    expect(got[0].award?.award).toBe("innsats");
  });

  it("tomt når ingenting nytt", () => {
    const bag = computeBag([], series("plopp", 1, ["hit", "hit", "hit"]));
    expect(newlyEarned(bag, bag)).toEqual([]);
  });
});

// ─── Nesten (2 av 5 i dag) ──────────────────────────────────────────────────

describe("nearMisses", () => {
  it("viser trinn i dag som manglet ett treff", () => {
    const entries = series("plopp", 3, ["hit", "miss", "hit", "miss", "miss"], "s", "2026-09-07");
    const bag = computeBag([], entries);
    expect(nearMisses(entries, bag, localDayKey(entries[0].created_at))).toEqual([
      { badgeId: "plopp", step: 3, best: 2 },
    ]);
  });

  it("ett treff av fem er ikke «nesten»", () => {
    const entries = series("plopp", 2, ["hit", "miss", "miss", "miss", "miss"], "s", "2026-09-09");
    const bag = computeBag([], entries);
    expect(nearMisses(entries, bag, localDayKey(entries[0].created_at))).toEqual([]);
  });

  it("hopper over trinn som er tatt og andre dager", () => {
    const entries = series("plopp", 1, ["hit", "hit", "hit"], "s", "2026-09-08");
    const bag = computeBag([], entries);
    expect(nearMisses(entries, bag, localDayKey(entries[0].created_at))).toEqual([]);
    expect(nearMisses(entries, bag, "1999-01-01")).toEqual([]);
  });
});

// ─── Inndata-hjelpere ───────────────────────────────────────────────────────

describe("parseMeters", () => {
  it("godtar komma og punktum", () => {
    expect(parseMeters("92")).toBe(92);
    expect(parseMeters("92,5")).toBe(92.5);
    expect(parseMeters(" 80.5 ")).toBe(80.5);
  });

  it("avviser tomt, null og urimelige lengder", () => {
    expect(parseMeters("")).toBeNull();
    expect(parseMeters("0")).toBeNull();
    expect(parseMeters("abc")).toBeNull();
    expect(parseMeters("501")).toBeNull();
  });
});

describe("referenceHint", () => {
  it("Laser viser korridoren i meter", () => {
    const laser = getAchievement("laser")!;
    expect(referenceHint(laser, laser.steps[2], 80)).toBe("Korridor: ±12 m sideveis");
  });

  it("Blink viser treffvinduet rundt mållengden", () => {
    const blink = getAchievement("blink")!;
    expect(referenceHint(blink, blink.steps[3], 60)).toBe("Treff: 54–66 m");
  });

  it("ingenting uten lengde eller for øvelser uten lengde", () => {
    const laser = getAchievement("laser")!;
    const plopp = getAchievement("plopp")!;
    expect(referenceHint(laser, laser.steps[0], null)).toBeNull();
    expect(referenceHint(plopp, plopp.steps[0], 80)).toBeNull();
  });
});

describe("earnedLabel", () => {
  it("stiger får trinnfargen, øyeblikk bare navnet", () => {
    expect(earnedLabel(getAchievement("plopp")!, 4)).toBe("⛳ Plopp blå");
    expect(earnedLabel(getAchievement("oppdager")!, 1)).toBe("🧭 Oppdager");
  });

  it("trenermerker viser typen", () => {
    const award = attempt("trener", { kind: "coach", award: "mot" });
    expect(earnedLabel(getAchievement("trener")!, 1, award)).toBe("🦁 Trenerens merke: Mot");
  });
});
