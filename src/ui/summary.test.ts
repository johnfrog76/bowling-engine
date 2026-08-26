import { gameFromRolls, simulateAutobowl } from "../engine";
import { PANEL_STATS, compareStat, summarise } from "./summary";

// The summary layer, pinned. Every number below is worked by hand from the
// roll list beside it — if a definition drifts, the arithmetic here disagrees
// before any panel does.

const PERFECT = gameFromRolls(Array(12).fill(10));
const ALL_GUTTERS = gameFromRolls(Array(20).fill(0));
const ALL_NINES = gameFromRolls(Array(20).fill(9).flatMap((n) => [n, 0]).slice(0, 20));
const ALL_SPARES = gameFromRolls([...Array(10).fill([5, 5]).flat(), 5]);

describe("reading a finished game back", () => {
  it("a perfect game is ten out of ten, every ball, all the bonus", () => {
    const s = summarise(PERFECT);
    expect(s.total).toBe(300);
    expect(s.firstBallAvg).toBe(10);
    expect(s.cleanFramePct).toBe(100);
    expect(s.markEfficiencyPct).toBe(100);
    expect(s.strikes).toBe(10);
    expect(s.opens).toBe(0);
    expect(s.openFrameCost).toBe(0);
  });

  it("twenty gutters has no marks, so it has NO efficiency — not zero", () => {
    const s = summarise(ALL_GUTTERS);
    expect(s.total).toBe(0);
    expect(s.firstBallAvg).toBe(0);
    expect(s.cleanFramePct).toBe(0);
    // the load-bearing distinction: the question was never asked
    expect(s.markEfficiencyPct).toBeNull();
    expect(s.openFrameCost).toBe(100);
    expect(s.opens).toBe(10);
  });

  it("nine and a miss every frame is accurate, never clean, and still has no efficiency", () => {
    const s = summarise(ALL_NINES);
    expect(s.total).toBe(90);
    expect(s.firstBallAvg).toBe(9);
    expect(s.cleanFramePct).toBe(0);
    expect(s.markEfficiencyPct).toBeNull();
    expect(s.openFrameCost).toBe(10); // one pin per frame
  });

  it("ten spares collects half the bonus available, because a spare's max is ten", () => {
    const s = summarise(ALL_SPARES);
    expect(s.total).toBe(150);
    expect(s.cleanFramePct).toBe(100);
    expect(s.spares).toBe(10);
    // ten marks × 10 possible = 100; each spare's next ball is a 5 → 50 earned
    expect(s.markEfficiencyPct).toBe(50);
  });
});

describe("the tenth frame counts as ONE frame", () => {
  // X X X X X X X X X | X 6 2 — nine strikes, then a tenth of X,6,2
  const game = gameFromRolls([...Array(9).fill(10), 10, 6, 2]);

  it("contributes one first ball to the average, not three", () => {
    const s = summarise(game);
    // ten first balls, all tens
    expect(s.firstBallAvg).toBe(10);
    expect(s.cleanFramePct).toBe(100);
  });

  it("earns its bonus from its own fill balls", () => {
    // the tenth is a strike: possible 20, earned 6 + 2 = 8
    const tenthOnly = summarise(gameFromRolls([...Array(18).fill(0), 10, 6, 2]));
    expect(tenthOnly.strikes).toBe(1);
    expect(tenthOnly.markEfficiencyPct).toBe((8 / 20) * 100);
  });

  it("scores clutch against the balls it actually earned, not a flat thirty", () => {
    // an open tenth was only ever offered twenty pins
    const openTenth = summarise(gameFromRolls([...Array(18).fill(0), 3, 4]));
    expect(openTenth.tenthClutchPct).toBe((7 / 20) * 100);
    // a strike in the tenth earns a third ball, so thirty is the right total
    const markTenth = summarise(gameFromRolls([...Array(18).fill(0), 10, 6, 2]));
    expect(markTenth.tenthClutchPct).toBe((18 / 30) * 100);
  });
});

describe("a game still being bowled", () => {
  it("averages over the frames actually thrown, not over ten", () => {
    // five frames of 8,1 — a half-played game is not a bad game
    const half = summarise(gameFromRolls(Array(5).fill([8, 1]).flat()));
    expect(half.firstBallAvg).toBe(8);
    expect(half.cleanFramePct).toBe(0);
  });

  it("answers nothing about a game with no rolls in it", () => {
    const none = summarise(gameFromRolls([]));
    expect(none.firstBallAvg).toBeNull();
    expect(none.cleanFramePct).toBeNull();
    expect(none.markEfficiencyPct).toBeNull();
  });
});

describe("two games side by side", () => {
  // the Smack Down's own seed pair — a real match, not a fixture
  const dev = summarise(simulateAutobowl(285));
  const alien = summarise(simulateAutobowl(443));
  const both = [dev, alien];

  it("names who leads a stat and by how much", () => {
    const c = compareStat(both, "firstBallAvg");
    expect(c.leader === 0 || c.leader === 1).toBe(true);
    expect(c.margin).toBeGreaterThan(0);
    expect(c.values).toHaveLength(2);
  });

  it("reads open-frame cost the other way up — fewer pins left is better", () => {
    const c = compareStat(both, "openFrameCost");
    const [a, b] = c.values as number[];
    expect(c.leader).toBe(a < b ? 0 : 1);
  });

  it("calls a tie a tie rather than picking the first bowler", () => {
    const c = compareStat([dev, dev], "cleanFramePct");
    expect(c.leader).toBeNull();
    expect(c.margin).toBe(0);
  });

  it("declines to compare a stat nobody could answer", () => {
    const gutters = summarise(ALL_GUTTERS);
    const c = compareStat([dev, gutters], "markEfficiencyPct");
    // a bowler who threw no marks has not LOST mark efficiency
    expect(c.leader).toBeNull();
    expect(c.margin).toBeNull();
  });

  it("shows three stats, one per question", () => {
    expect(PANEL_STATS).toEqual(["firstBallAvg", "cleanFramePct", "markEfficiencyPct"]);
  });
});
