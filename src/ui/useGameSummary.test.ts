import { emptyMatch, matchFromRolls, simulateAutobowl, type Match } from "../engine";
import { NO_ANSWER, buildSummaryView } from "./useGameSummary";
import type { PlayerConfig } from "./settings";

// The packaging layer, pinned. `summary.test.ts` proves the arithmetic; this
// proves the panel is handed something it can render without doing any.

const DEV: PlayerConfig = { kind: "dev", skill: "league" };
const ALIEN: PlayerConfig = { kind: "alien", skill: "pro" };
const ROOKIE: PlayerConfig = { kind: "robot", skill: "rookie" };

const rollsOf = (seed: number) => simulateAutobowl(seed).frames.flatMap((f) => f.rolls);
/** the Smack Down's own seed pair — 198 to 199, decided in the tenth */
const MATCH: Match = matchFromRolls([rollsOf(285), rollsOf(443)]);

describe("the package a panel renders", () => {
  const view = buildSummaryView(MATCH, [DEV, ALIEN]);

  it("hands over one row per bowler, already named and coloured", () => {
    expect(view.rows.map((r) => r.name)).toEqual(["DEV", "ALIEN"]);
    expect(view.rows[0].chrome).toBe("#4fc3d9");
    expect(view.rows[1].chrome).toBe("#7ee787");
    expect(view.rows.map((r) => r.total)).toEqual([198, 199]);
  });

  it("carries the LEVEL trophy, never the outcome", () => {
    // Alien wins the match AND is the pro; Dev loses and is league. The metals
    // must track the skill either way — the winner's mark is a separate object.
    expect(view.rows[0].metal).toBe("silver");
    expect(view.rows[1].metal).toBe("gold");
    const loserIsPro = buildSummaryView(MATCH, [ALIEN, ROOKIE]);
    expect(loserIsPro.rows[0].metal).toBe("gold");
    expect(loserIsPro.rows[1].metal).toBeNull();
  });

  it("names the winner by score", () => {
    expect(view.winner).toBe(1);
    expect(view.over).toBe(true);
  });

  it("shows three stats, formatted with their units", () => {
    expect(view.stats.map((s) => s.key)).toEqual(["firstBallAvg", "cleanFramePct", "markEfficiencyPct"]);
    expect(view.stats.map((s) => s.label)).toEqual([
      "First-Ball Pinfall Avg",
      "Clean Frame %",
      "Mark Efficiency %",
    ]);
    expect(view.stats[0].display[0]).toMatch(/^\d+\.\d pins$/);
    expect(view.stats[1].display[0]).toMatch(/^\d+%$/);
  });

  it("gives conversion a subtitle and the other two none", () => {
    expect(view.stats[0].detail).toEqual([null, null]);
    expect(view.stats[2].detail[0]).toMatch(/^\d+ strikes \/ \d+ spares$/);
  });

  it("resolves the leader of each stat to a bowler", () => {
    for (const stat of view.stats) {
      expect(stat.leader === null || stat.leader === 0 || stat.leader === 1).toBe(true);
      expect(stat.values).toHaveLength(2);
      expect(stat.display).toHaveLength(2);
    }
  });
});

describe("what it refuses to invent", () => {
  it("prints an unanswerable stat as a dash, never as zero", () => {
    const gutters = matchFromRolls([Array(20).fill(0)]);
    const view = buildSummaryView(gutters, [DEV]);
    const efficiency = view.stats.find((s) => s.key === "markEfficiencyPct");
    expect(efficiency?.values[0]).toBeNull();
    expect(efficiency?.display[0]).toBe(NO_ANSWER);
    // and 0% is genuinely different: this bowler DID have clean frames to miss
    expect(view.stats.find((s) => s.key === "cleanFramePct")?.display[0]).toBe("0%");
  });

  it("names no winner in a solo game — there is nobody to be ahead of", () => {
    const solo = buildSummaryView(matchFromRolls([rollsOf(285)]), [DEV]);
    expect(solo.rows).toHaveLength(1);
    expect(solo.winner).toBeNull();
    expect(solo.rows[0].total).toBe(198);
  });

  it("names no winner on a tie", () => {
    const tied = matchFromRolls([rollsOf(285), rollsOf(285)]);
    expect(buildSummaryView(tied, [DEV, ALIEN]).winner).toBeNull();
  });

  it("survives a roster and a match being one render apart", () => {
    // the roster grew before the match did, or the other way round
    expect(() => buildSummaryView(emptyMatch(2), [DEV])).not.toThrow();
    expect(buildSummaryView(emptyMatch(2), [DEV]).rows).toHaveLength(2);
  });

  it("reads a game still in progress rather than waiting for the end", () => {
    const halfway = buildSummaryView(matchFromRolls([[8, 1, 8, 1, 8, 1]]), [DEV]);
    expect(halfway.over).toBe(false);
    expect(halfway.stats[0].display[0]).toBe("8.0 pins");
  });
});
