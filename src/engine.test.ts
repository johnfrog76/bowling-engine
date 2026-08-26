import {
  allRolls,
  applyMatchRoll,
  applyRoll,
  bowlerUp,
  classifyMood,
  currentFrameIndex,
  emptyGame,
  emptyMatch,
  frameScores,
  gameFromRolls,
  isFrameComplete,
  isGameOver,
  isGutterTrigger,
  isMatchOver,
  isOpen,
  isSpare,
  isSplit,
  isStrike,
  matchFromRolls,
  matchScores,
  mulberry32,
  pinsNeededNextFrame,
  runningTotal,
  scoreFrame,
  simulateAutobowl,
  standingAfter,
  totalScore,
  FULL_RACK,
  PERFECT_GAME,
  type Game,
  type Match,
} from "./engine";

// These tests exist because the consuming decks make factual claims on screen.
// If the engine drifts, they start lying — and they are decks about scoring
// being an algorithm rather than a vibe. Every number asserted here appears on
// a slide.

/** Twelve strikes: the 10th frame owes two fill balls, so twelve, not ten. */
const PERFECT_ROLLS = Array<number>(12).fill(10);

/** 5/5 in every frame plus one fill ball: the canonical 150 game. */
const ALL_SPARES_ROLLS = [...Array<number>(20).fill(5), 5];

describe("the model — a Frame holds rolls and nothing else", () => {
  // The whole corrective. Every one of these is DERIVED on demand; none of it
  // is stored on a frame where it could go stale.
  it("derives strike, spare and open from the rolls alone", () => {
    expect(isStrike({ rolls: [10] })).toBe(true);
    expect(isSpare({ rolls: [7, 3] })).toBe(true);
    expect(isOpen({ rolls: [7, 2] })).toBe(true);
    expect(isStrike({ rolls: [7, 3] })).toBe(false);
    expect(isSpare({ rolls: [10, 0] })).toBe(false); // a strike, not a spare
  });

  it("advances the frame because the frame is complete, not via a roll counter", () => {
    // The classic bug this model exists to prevent: faking frame advancement
    // by double-incrementing a roll count on a strike. Here a strike ends the
    // frame because a strike IS a complete frame.
    let game = emptyGame();
    expect(currentFrameIndex(game)).toBe(0);
    game = applyRoll(game, 10);
    expect(currentFrameIndex(game)).toBe(1);
    game = applyRoll(game, 4);
    expect(currentFrameIndex(game)).toBe(1); // frame 2 still open
    game = applyRoll(game, 3);
    expect(currentFrameIndex(game)).toBe(2);
  });

  it("never mutates the game it is given", () => {
    const first = gameFromRolls([10, 4]);
    const snapshot = JSON.stringify(first);
    const second = applyRoll(first, 3);
    expect(JSON.stringify(first)).toBe(snapshot);
    expect(second).not.toBe(first);
  });

  it("rejects a roll outside 0–10", () => {
    expect(() => applyRoll(emptyGame(), 11)).toThrow(RangeError);
    expect(() => applyRoll(emptyGame(), -1)).toThrow(RangeError);
  });
});

describe("open frames — no bonus, resolved immediately", () => {
  it("scores 4 + 3 = 7 the moment the second ball lands", () => {
    const game = gameFromRolls([4, 3]);
    expect(scoreFrame(game, 0)).toEqual({ value: 7, resolved: true });
  });

  it("is unresolved after only one ball, because the frame is not finished", () => {
    const game = gameFromRolls([4]);
    expect(scoreFrame(game, 0)).toEqual({ value: null, resolved: false });
  });

  it("a whole game of 4,3 scores 70 — twenty balls, no bonuses", () => {
    const game = gameFromRolls(Array<number[]>(10).fill([4, 3]).flat());
    expect(totalScore(game)).toBe(70);
  });
});

describe("spares — ten plus the next ONE roll", () => {
  it("7/ followed by a 4 scores 14", () => {
    const game = gameFromRolls([7, 3, 4, 2]);
    expect(scoreFrame(game, 0)).toEqual({ value: 14, resolved: true });
    expect(scoreFrame(game, 1)).toEqual({ value: 6, resolved: true });
    expect(runningTotal(game, 1)).toBe(20);
  });

  it("holds a spare open until its one lookback roll lands", () => {
    const pending = gameFromRolls([7, 3]);
    expect(scoreFrame(pending, 0)).toEqual({ value: null, resolved: false });
    const landed = applyRoll(pending, 6);
    expect(scoreFrame(landed, 0)).toEqual({ value: 16, resolved: true });
  });

  it("a frame-9 spare takes its bonus from frame 10", () => {
    // Eight open frames of 0,0, then 5/ in the 9th, then 8,1 in the 10th.
    // The 9th frame's lookback reaches ACROSS the frame boundary into the
    // 10th's first ball: 10 + 8 = 18.
    const game = gameFromRolls([...Array<number>(16).fill(0), 5, 5, 8, 1]);
    expect(scoreFrame(game, 8)).toEqual({ value: 18, resolved: true });
    expect(scoreFrame(game, 9)).toEqual({ value: 9, resolved: true });
    expect(totalScore(game)).toBe(27);
  });
});

describe("strikes — ten plus the next TWO rolls", () => {
  it("X followed by 4,3 scores 17", () => {
    const game = gameFromRolls([10, 4, 3]);
    expect(scoreFrame(game, 0)).toEqual({ value: 17, resolved: true });
    expect(scoreFrame(game, 1)).toEqual({ value: 7, resolved: true });
    expect(runningTotal(game, 1)).toBe(24);
  });

  it("stays unresolved after only ONE lookback roll", () => {
    const game = gameFromRolls([10, 4]);
    expect(scoreFrame(game, 0)).toEqual({ value: null, resolved: false });
  });

  it("borrows a following spare's two balls, not the spare's bonus", () => {
    // X then 7/ — the strike takes 7 and 3, giving 20. It does NOT take the
    // spare's own resolved score.
    const game = gameFromRolls([10, 7, 3, 5, 0]);
    expect(scoreFrame(game, 0)).toEqual({ value: 20, resolved: true });
    expect(scoreFrame(game, 1)).toEqual({ value: 15, resolved: true });
  });
});

describe("chained strikes — the turkey, where the lookback must walk", () => {
  // A strike's second bonus ball cannot come from the next frame when that
  // frame is ALSO a strike: it has only one ball to give. The walk has to
  // continue into the frame after it. This is the case hand-rolled scorers
  // get wrong.
  const turkey = gameFromRolls([10, 10, 10, 4, 3]);

  it("the first strike borrows from N+1 and N+2: 10 + 10 + 10 = 30", () => {
    expect(scoreFrame(turkey, 0)).toEqual({ value: 30, resolved: true });
  });

  it("the second strike takes the third strike and the 4: 10 + 10 + 4 = 24", () => {
    expect(scoreFrame(turkey, 1)).toEqual({ value: 24, resolved: true });
  });

  it("the third strike takes both balls of the open frame: 10 + 4 + 3 = 17", () => {
    expect(scoreFrame(turkey, 2)).toEqual({ value: 17, resolved: true });
  });

  it("runs to 78 through four frames", () => {
    expect(runningTotal(turkey, 3)).toBe(78);
  });

  it("holds all three open until the two balls after the last one land", () => {
    const pending = gameFromRolls([10, 10, 10]);
    expect(scoreFrame(pending, 0)).toEqual({ value: 30, resolved: true });
    expect(scoreFrame(pending, 1)).toEqual({ value: null, resolved: false });
    expect(scoreFrame(pending, 2)).toEqual({ value: null, resolved: false });
  });
});

describe("the 10th frame — the rule everybody forgets", () => {
  const eighteenZeros = Array<number>(18).fill(0);

  it("open: two balls, no fill, game over", () => {
    const game = gameFromRolls([...eighteenZeros, 6, 2]);
    expect(scoreFrame(game, 9)).toEqual({ value: 8, resolved: true });
    expect(isGameOver(game)).toBe(true);
  });

  it("spare: earns exactly one fill ball, and 5/5 scores 15", () => {
    const two = gameFromRolls([...eighteenZeros, 5, 5]);
    expect(isFrameComplete(two, 9)).toBe(false);
    expect(scoreFrame(two, 9)).toEqual({ value: null, resolved: false });

    const filled = applyRoll(two, 5);
    expect(scoreFrame(filled, 9)).toEqual({ value: 15, resolved: true });
    expect(isGameOver(filled)).toBe(true);
    // And no fourth ball is ever taken.
    expect(applyRoll(filled, 10).frames[9].rolls).toHaveLength(3);
  });

  it("strike: earns TWO fill balls — X,X,X scores 30", () => {
    const one = gameFromRolls([...eighteenZeros, 10]);
    expect(scoreFrame(one, 9)).toEqual({ value: null, resolved: false });

    const two = applyRoll(one, 10);
    expect(scoreFrame(two, 9)).toEqual({ value: null, resolved: false });

    const three = applyRoll(two, 10);
    expect(scoreFrame(three, 9)).toEqual({ value: 30, resolved: true });
    expect(isGameOver(three)).toBe(true);
  });

  it("resets the rack for a fill ball — X,7,2 scores 19, not a negative leave", () => {
    // Pins standing and rolls thrown are separate variables. After a strike in
    // the 10th the rack is full again for the fill balls.
    const game = gameFromRolls([...eighteenZeros, 10, 7, 2]);
    expect(scoreFrame(game, 9)).toEqual({ value: 19, resolved: true });
  });

  it("borrows from no later frame — there is none", () => {
    const game = gameFromRolls([...eighteenZeros, 10, 10, 10]);
    expect(scoreFrame(game, 9).value).toBe(30);
    expect(scoreFrame(game, 10)).toEqual({ value: null, resolved: false });
  });
});

describe("runningTotal — sums resolved frames only, never a null", () => {
  it("ignores a pending strike rather than half-crediting it", () => {
    // A score that later goes DOWN is worse than a score that is briefly blank.
    const game = gameFromRolls([4, 3, 10]);
    expect(scoreFrame(game, 1).resolved).toBe(false);
    expect(runningTotal(game, 1)).toBe(7);
  });

  it("adds the pending frame in only once its lookback lands", () => {
    const game = gameFromRolls([4, 3, 10, 5, 2]);
    expect(runningTotal(game, 1)).toBe(24); // 7 + 17
    expect(runningTotal(game, 2)).toBe(31); // + 7
  });

  it("never returns NaN when frames are unrolled", () => {
    const game = gameFromRolls([10]);
    expect(runningTotal(game, 9)).toBe(0);
    expect(frameScores(game).filter((f) => f.resolved)).toHaveLength(0);
  });
});

describe("target math — bonuses are the currency, not pins", () => {
  it("reports the honest gap to the goal", () => {
    const game = gameFromRolls([4, 3, 4, 3]); // 14 through two frames
    const t = pinsNeededNextFrame(game, 100);
    expect(t.pinsNeeded).toBe(86);
    expect(t.framesRemaining).toBe(8);
    expect(t.feasible).toBe(true);
  });

  it("floors pinsNeeded at zero once the goal is met", () => {
    const game = gameFromRolls([10, 10, 10, 10, 10, 10]);
    expect(pinsNeededNextFrame(game, 50).pinsNeeded).toBe(0);
  });

  it("a 300 goal is feasible on an empty game and infeasible after one bad ball", () => {
    expect(pinsNeededNextFrame(emptyGame(), PERFECT_GAME).feasible).toBe(true);
    expect(pinsNeededNextFrame(gameFromRolls([9]), PERFECT_GAME).feasible).toBe(false);
  });

  it("reasons about best-case chaining, not raw pins remaining", () => {
    // Nine open frames of 9,0 = 81. One frame left, so 30 raw pins at most —
    // but the 10th frame's three strikes are worth 30 exactly, so 111 is the
    // ceiling. A naive "pins remaining" estimate would agree here by accident;
    // what it could not do is know the frame gets THREE balls.
    const nineFrames = Array<number[]>(9).fill([9, 0]).flat();
    const game = gameFromRolls(nineFrames);
    expect(totalScore(game)).toBe(81);
    expect(pinsNeededNextFrame(game, 111).feasible).toBe(true);
    expect(pinsNeededNextFrame(game, 112).feasible).toBe(false);
  });

  it("counts a pending strike's future bonus as reachable", () => {
    // Eight frames of 9,0 = 72, then a strike in the 9th. Best case: the 9th
    // strike takes two more strikes (30), and the 10th takes three (30) —
    // 72 + 30 + 30 = 132.
    const game = gameFromRolls([...Array<number[]>(8).fill([9, 0]).flat(), 10]);
    expect(pinsNeededNextFrame(game, 132).feasible).toBe(true);
    expect(pinsNeededNextFrame(game, 133).feasible).toBe(false);
  });

  it("has no frames remaining once the game is over", () => {
    const game = gameFromRolls(PERFECT_ROLLS);
    const t = pinsNeededNextFrame(game, 300);
    expect(t.framesRemaining).toBe(0);
    expect(t.pinsNeeded).toBe(0);
    expect(t.feasible).toBe(true);
  });
});

describe("isGutterTrigger — a named predicate, not a magic number", () => {
  it("fires at the boundary: 2 is a trigger, 3 is not", () => {
    expect(isGutterTrigger(2)).toBe(true);
    expect(isGutterTrigger(3)).toBe(false);
  });

  it.each([
    [0, true],
    [1, true],
    [2, true],
    [3, false],
    [10, false],
  ])("%i → %s", (pins, expected) => {
    expect(isGutterTrigger(pins)).toBe(expected);
  });
});

describe("classifyMood — one assertion per branch, five branches", () => {
  const game = gameFromRolls([4, 3]);

  it("idle when nothing worth reacting to has happened", () => {
    expect(classifyMood(game, { kind: "idle" })).toBe("idle");
  });

  it("coaching only from an explicit request — never inferred from the pins", () => {
    // Teaching is consumer-initiated: no arrangement of pins means "explain
    // this to me," so it has to arrive as an event.
    expect(classifyMood(game, { kind: "teaching" })).toBe("coaching");
  });

  it("rage on a gutter-grade roll", () => {
    expect(classifyMood(game, { kind: "roll", pins: 1 })).toBe("rage");
    expect(classifyMood(game, { kind: "roll", pins: 7 })).not.toBe("rage");
  });

  it("celebration on a strike", () => {
    expect(classifyMood(game, { kind: "roll", pins: 10 })).toBe("celebration");
  });

  it("celebration on a frame that resolved with a bonus, idle on an open one", () => {
    const mixed = gameFromRolls([10, 7, 3, 4, 2]);
    expect(classifyMood(mixed, { kind: "frameResolved", frameIndex: 0 })).toBe("celebration");
    expect(classifyMood(mixed, { kind: "frameResolved", frameIndex: 1 })).toBe("celebration");
    expect(classifyMood(mixed, { kind: "frameResolved", frameIndex: 2 })).toBe("idle");
  });

  it("suspense while the 10th frame is still owed a fill ball", () => {
    const pending = gameFromRolls([...Array<number>(18).fill(0), 5, 5]);
    expect(classifyMood(pending, { kind: "idle" })).toBe("suspense");

    const done = applyRoll(pending, 5);
    expect(classifyMood(done, { kind: "idle" })).toBe("idle");
  });

  it("is pure — same game and event, same answer", () => {
    const a = classifyMood(game, { kind: "roll", pins: 0 });
    const b = classifyMood(game, { kind: "roll", pins: 0 });
    expect(a).toBe(b);
  });
});

describe("simulateAutobowl — deterministic, plausible, demo-safe", () => {
  it("the same seed produces an identical game, twice — pinfall included", () => {
    // Deep equality covers the pin arrays, not just the counts: a still frame
    // built from a seed must reproduce the same LEAVES, or the renderer draws
    // a different lane from the one that was reviewed.
    expect(simulateAutobowl(42)).toEqual(simulateAutobowl(42));
    expect(simulateAutobowl(7)).toEqual(simulateAutobowl(7));
    expect(simulateAutobowl(42).frames.map((f) => f.pinfall)).toEqual(
      simulateAutobowl(42).frames.map((f) => f.pinfall),
    );
  });

  it("different seeds produce different games", () => {
    const seen = new Set([1, 2, 3, 4, 5].map((s) => JSON.stringify(simulateAutobowl(s))));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("guarantees a 0–2-pin roll within the first three frames", () => {
    // The poster-demo guarantee: a demo that only sometimes shows a bad roll
    // is a demo that sometimes cannot show what it is about.
    for (let seed = 1; seed <= 60; seed++) {
      const game = simulateAutobowl(seed);
      const early = game.frames.slice(0, 3).flatMap((f) => f.rolls);
      expect(early.some(isGutterTrigger)).toBe(true);
    }
  });

  it("always bowls a complete, legal, scorable game", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const game = simulateAutobowl(seed);
      expect(game.frames).toHaveLength(10);
      expect(isGameOver(game)).toBe(true);
      const score = totalScore(game);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(PERFECT_GAME);
      expect(frameScores(game).every((f) => f.resolved)).toBe(true);
    }
  });

  it("never leaves more than ten pins standing in a frame's first two balls", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const [i, frame] of simulateAutobowl(seed).frames.entries()) {
        if (i < 9) expect(frame.rolls.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(10);
        else expect(frame.rolls.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("scores like a mid-skill bowler, not a machine", () => {
    const scores = Array.from({ length: 40 }, (_, i) => totalScore(simulateAutobowl(i + 1)));
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(mean).toBeGreaterThan(60);
    expect(mean).toBeLessThan(200);
  });

  it("mulberry32 is stable and stays in [0,1)", () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pin identity — the fact a count cannot carry", () => {
  it("records which pins fell, and derives the count from them", () => {
    const game = applyRoll(emptyGame(), [1, 3, 5, 9]);
    expect(game.frames[0].rolls).toEqual([4]);
    expect(game.frames[0].pinfall).toEqual([[1, 3, 5, 9]]);
  });

  it("keeps pinfall aligned with rolls, one entry per roll", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const frame of simulateAutobowl(seed).frames) {
        expect(frame.pinfall).toBeDefined();
        expect(frame.pinfall).toHaveLength(frame.rolls.length);
        frame.pinfall?.forEach((felled, i) => {
          expect(felled).toHaveLength(frame.rolls[i]);
          expect(new Set(felled).size).toBe(felled.length); // no pin twice
        });
      }
    }
  });

  it("scores a pin-tracked game identically to the same game entered as counts", () => {
    // The boundary that matters: identity is information for the renderer, and
    // must never reach the scoreboard.
    const tracked = simulateAutobowl(12);
    const counts = gameFromRolls(allRolls(tracked));
    expect(totalScore(counts)).toBe(totalScore(tracked));
    expect(frameScores(counts)).toEqual(frameScores(tracked));
  });

  it("standingAfter reports the leave the roll actually left", () => {
    const game = applyRoll(emptyGame(), [1, 2, 3, 4, 5, 6, 8, 9]);
    expect(standingAfter(game.frames[0], 0)).toEqual([7, 10]);
  });

  it("standingAfter stands the rack back up after a clear", () => {
    // The 10th frame: a strike clears the rack, and the fill ball faces ten
    // pins again. Derived by walking the rolls, never by one big subtraction.
    let game = gameFromRolls(Array<number>(18).fill(0));
    game = applyRoll(game, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // strike
    expect(standingAfter(game.frames[9], 0)).toEqual([...FULL_RACK]);
    game = applyRoll(game, [1, 3, 5]); // fill ball off a fresh rack
    expect(standingAfter(game.frames[9], 1)).toEqual([2, 4, 6, 7, 8, 9, 10]);
  });

  it("falls back to a full rack rather than inventing a leave it does not know", () => {
    const countOnly = gameFromRolls([7]);
    expect(standingAfter(countOnly.frames[0], 0)).toEqual([...FULL_RACK]);
  });

  it("refuses to fell the same pin twice in one roll", () => {
    expect(() => applyRoll(emptyGame(), [7, 7])).toThrow(RangeError);
  });
});

describe("isSplit — derived from the rack's geometry, not a list of famous leaves", () => {
  it("7-10 is a split — the one that has to be right", () => {
    expect(isSplit([7, 10])).toBe(true);
  });

  it("4-5 is not a split — adjacent pins are one cluster", () => {
    expect(isSplit([4, 5])).toBe(false);
  });

  it("2-7 is a split — the baby split", () => {
    expect(isSplit([2, 7])).toBe(true);
  });

  it("is never a split while the headpin stands, however wide the gaps look", () => {
    expect(isSplit([1, 2, 8])).toBe(false);
    expect(isSplit([1, 7, 10])).toBe(false);
  });

  it("a single pin is never a split — one ball, one place to be", () => {
    expect(isSplit([7])).toBe(false);
    expect(isSplit([10])).toBe(false);
    expect(isSplit([])).toBe(false);
  });

  it("names more splits than anyone bothered to name", () => {
    expect(isSplit([4, 6, 7, 10])).toBe(true); // the big one
    expect(isSplit([5, 7])).toBe(true);
    expect(isSplit([2, 3])).toBe(false); // neighbours, and no gap
  });

  it("counts the gap where a pin used to be — 8-10 is split, 9-10 is not", () => {
    // The back row is 7 8 9 10, so the 9 sits BETWEEN the 8 and the 10: an
    // 8-10 leave has a hole in it and is a genuine split, while 9-10 are
    // touching. Caught by the adjacency graph disagreeing with a first draft
    // of this test, which had assumed "same row" meant "adjacent."
    expect(isSplit([8, 10])).toBe(true);
    expect(isSplit([9, 10])).toBe(false);
    expect(isSplit([7, 8])).toBe(false);
  });

  it("can judge a simulated leave without the renderer's help", () => {
    const game = simulateAutobowl(3);
    const leaves = game.frames.map((f) => standingAfter(f, 0));
    expect(leaves.every((leave) => typeof isSplit(leave) === "boolean")).toBe(true);
  });
});

describe("the two games everybody knows", () => {
  it("twelve strikes is exactly 300", () => {
    const game = gameFromRolls(PERFECT_ROLLS);
    expect(totalScore(game)).toBe(PERFECT_GAME);
    expect(isGameOver(game)).toBe(true);
    // Every frame except the last is worth 30; the last is its own three balls.
    expect(frameScores(game).map((f) => f.value)).toEqual([30, 30, 30, 30, 30, 30, 30, 30, 30, 30]);
    expect(runningTotal(game, 8)).toBe(270);
  });

  it("5/5 in every frame plus a 5 fill is exactly 150", () => {
    const game = gameFromRolls(ALL_SPARES_ROLLS);
    expect(totalScore(game)).toBe(150);
    // Each frame is 10 + the next 5 = 15, ten times.
    expect(frameScores(game).map((f) => f.value)).toEqual([15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
  });

  it("twenty gutter balls is exactly 0, and still a finished game", () => {
    const game = gameFromRolls(Array<number>(20).fill(0));
    expect(totalScore(game)).toBe(0);
    expect(isGameOver(game)).toBe(true);
  });

  it("nine pins every frame, never a spare, is 90", () => {
    const game = gameFromRolls(Array<number[]>(10).fill([9, 0]).flat());
    expect(totalScore(game)).toBe(90);
  });

  it("scores incrementally the same way it scores at the end", () => {
    // Replaying roll by roll must never disagree with scoring the finished
    // game — there is only one scoring path, and this proves it.
    let game: Game = emptyGame();
    for (const pins of PERFECT_ROLLS) {
      game = applyRoll(game, pins);
      expect(totalScore(game)).toBe(runningTotal(game, 9));
    }
    expect(totalScore(game)).toBe(PERFECT_GAME);
  });
});

describe("a match — N games and one derived question", () => {
  it("starts with the first bowler in the roster up", () => {
    expect(bowlerUp(emptyMatch(2))).toBe(0);
  });

  it("a match of one behaves exactly like a lone game", () => {
    // There is no separate single-player path — solo is N=1, not a branch.
    let solo = emptyMatch(1);
    for (const pins of PERFECT_ROLLS) solo = applyMatchRoll(solo, pins);
    expect(matchScores(solo)).toEqual([PERFECT_GAME]);
    expect(isMatchOver(solo)).toBe(true);
  });

  it("holds the lane for a second ball when the first leaves pins", () => {
    const match = applyMatchRoll(emptyMatch(2), 7);
    // Frame 1 is not finished, so bowler 0 is still up. No flip.
    expect(bowlerUp(match)).toBe(0);
  });

  it("passes the lane after ONE roll when that roll is a strike", () => {
    // The case a turn counter has to special-case: a strike ends the frame
    // after one ball. Nothing flips here — bowler 0's frame index advanced.
    const match = applyMatchRoll(emptyMatch(2), 10);
    expect(bowlerUp(match)).toBe(1);
  });

  it("passes the lane after TWO rolls when the frame is open", () => {
    let match = applyMatchRoll(emptyMatch(2), 7);
    match = applyMatchRoll(match, 2);
    expect(bowlerUp(match)).toBe(1);
  });

  it("comes back to the first bowler once everyone has bowled the frame", () => {
    let match = applyMatchRoll(emptyMatch(2), 10); // bowler 0 strikes, lane passes
    match = applyMatchRoll(match, 10); // bowler 1 strikes, lane passes back
    expect(bowlerUp(match)).toBe(0);
    expect(currentFrameIndex(match.games[0])).toBe(1);
    expect(currentFrameIndex(match.games[1])).toBe(1);
  });

  it("alternates cleanly across three bowlers", () => {
    let match = emptyMatch(3);
    const seen: (number | null)[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(bowlerUp(match));
      match = applyMatchRoll(match, 10); // everyone strikes: one ball each
    }
    expect(seen).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it("keeps the lane for all three balls of the 10th frame", () => {
    // The frame that breaks every other rule needs no special case:
    // currentFrameIndex stays at 9 until the fill balls have landed.
    const NINE_OPEN = Array<number[]>(9).fill([4, 4]).flat();
    let match = matchFromRolls([NINE_OPEN, NINE_OPEN]);
    expect(bowlerUp(match)).toBe(0);
    match = applyMatchRoll(match, 10); // strike in the 10th — earns two fills
    expect(bowlerUp(match)).toBe(0);
    match = applyMatchRoll(match, 10); // first fill
    expect(bowlerUp(match)).toBe(0);
    match = applyMatchRoll(match, 10); // second fill — NOW the lane passes
    expect(bowlerUp(match)).toBe(1);
  });

  it("skips a bowler whose game is over and lets the other finish", () => {
    const match = matchFromRolls([PERFECT_ROLLS, []]);
    expect(isGameOver(match.games[0])).toBe(true);
    // Bowler 0 is done; every remaining roll belongs to bowler 1.
    expect(bowlerUp(match)).toBe(1);
    expect(isMatchOver(match)).toBe(false);
  });

  it("is over only when every game is over, and then ignores further rolls", () => {
    const match = matchFromRolls([PERFECT_ROLLS, PERFECT_ROLLS]);
    expect(isMatchOver(match)).toBe(true);
    expect(bowlerUp(match)).toBeNull();
    expect(applyMatchRoll(match, 10)).toBe(match); // a held-down button, not an error
  });

  it("never mutates the match it was handed", () => {
    const before = emptyMatch(2);
    const after = applyMatchRoll(before, 7);
    expect(before.games[0].frames).toHaveLength(0);
    expect(after.games[0].frames).toHaveLength(1);
  });

  it("leaves the bowlers who are not up completely untouched", () => {
    const before = emptyMatch(2);
    const after = applyMatchRoll(before, 7);
    expect(after.games[1]).toBe(before.games[1]); // same reference, not a copy
  });

  // ── the claim the whole match layer rests on ──────────────────────────────
  it("scores an interleaved match identically to the same games bowled alone", () => {
    // No lookback ever crosses a bowler boundary. If that is true, then the
    // order the rolls arrive in cannot matter — interleaving two games must
    // give the same two scores as bowling them one after the other. This is
    // the entire correctness claim of the match layer, in one assertion.
    const a = simulateAutobowl(8);
    const b = simulateAutobowl(17);
    const rollsA = allRolls(a);
    const rollsB = allRolls(b);

    let match: Match = emptyMatch(2);
    const queues = [[...rollsA], [...rollsB]];
    let guard = 0;
    while (!isMatchOver(match) && guard++ < 100) {
      const up = bowlerUp(match);
      if (up === null) break;
      const next = queues[up].shift();
      if (next === undefined) break;
      match = applyMatchRoll(match, next);
    }

    expect(queues[0]).toHaveLength(0); // every roll was consumed by its owner
    expect(queues[1]).toHaveLength(0);
    expect(matchScores(match)).toEqual([totalScore(a), totalScore(b)]);
    expect(frameScores(match.games[0])).toEqual(frameScores(a));
    expect(frameScores(match.games[1])).toEqual(frameScores(b));
  });

  it("carries pin identity through a match the same way a lone game does", () => {
    // Pin-tracked entry has to survive interleaving too — the leave belongs to
    // the bowler who threw it, not to the lane.
    let match = emptyMatch(2);
    match = applyMatchRoll(match, [1, 2, 3, 5, 8, 9] as const); // bowler 0 leaves the 4-6-7-10
    expect(bowlerUp(match)).toBe(0); // a leave keeps the lane — second ball owed
    match = applyMatchRoll(match, [4, 6] as const); // misses the corners, frame closes
    match = applyMatchRoll(match, [1, 2, 4] as const); // now bowler 1's own leave
    expect(standingAfter(match.games[0].frames[0], 0)).toEqual([4, 6, 7, 10]);
    expect(standingAfter(match.games[0].frames[0], 1)).toEqual([7, 10]);
    expect(standingAfter(match.games[1].frames[0], 0)).toEqual([3, 5, 6, 7, 8, 9, 10]);
  });
});
