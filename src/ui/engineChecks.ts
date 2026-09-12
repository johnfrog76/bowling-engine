import {
  allRolls,
  applyMatchRoll,
  applyRoll,
  bowlerUp,
  emptyGame,
  emptyMatch,
  gameFromRolls,
  isGutterTrigger,
  isMatchOver,
  isSplit,
  matchFromRolls,
  matchScores,
  pinsNeededNextFrame,
  runningTotal,
  scoreFrame,
  simulateAutobowl,
  standingAfter,
  totalScore,
  type Game,
  type PinId,
} from "../engine";

/**
 * The engine's guarantees, checked IN THE BROWSER.
 *
 * The repo's Jest suite is the real one and it is what CI runs. This is a
 * second, smaller harness that exists for a different reason: a visitor should
 * be able to watch the guarantee being proved rather than take a badge's word
 * for it.
 *
 * So these are not mocks or a canned result. Every check below calls the same
 * exported functions the lane and the scoreboard call, and the numbers on
 * screen are computed at the moment you press Run. If somebody breaks the
 * engine and deploys it, this page goes red on its own.
 *
 * Kept deliberately free of any test framework: plain functions returning
 * pass/fail counts, so nothing needs bundling that would not otherwise ship.
 */

export interface CheckResult {
  name: string;
  passed: number;
  total: number;
  /** First failure, if any — enough to see what went wrong without a console. */
  detail?: string;
}

type Assert = (ok: boolean, detail: string) => void;

function group(name: string, body: (t: Assert) => void): CheckResult {
  let passed = 0;
  let total = 0;
  let detail: string | undefined;
  const t: Assert = (ok, d) => {
    total++;
    if (ok) passed++;
    else if (!detail) detail = d;
  };
  try {
    body(t);
  } catch (e) {
    total++;
    detail = detail ?? `threw: ${(e as Error).message}`;
  }
  return { name, passed, total, detail };
}

export const CHECKS: (() => CheckResult)[] = [
  () =>
    group("The perfect game is 300", (t) => {
      const perfect = gameFromRolls(Array.from({ length: 12 }, () => 10));
      t(totalScore(perfect) === 300, `twelve strikes should score 300, got ${totalScore(perfect)}`);
      const spares = gameFromRolls(Array.from({ length: 21 }, () => 5));
      t(totalScore(spares) === 150, `all 5/5 spares should score 150, got ${totalScore(spares)}`);
    }),

  () =>
    group("The lookback", (t) => {
      // A spare is worth 10 plus the NEXT roll; a strike, 10 plus the next two.
      const spare = gameFromRolls([9, 1, 7, 2]);
      t(scoreFrame(spare, 0).value === 17, "9/ then 7 should score 17");
      const strike = gameFromRolls([10, 4, 3]);
      t(scoreFrame(strike, 0).value === 17, "X then 4,3 should score 17");
      // Chained strikes: the second bonus roll walks INTO the following
      // strike's own first roll — the classic implementation trap.
      const turkey = gameFromRolls([10, 10, 10, 4, 2]);
      t(scoreFrame(turkey, 0).value === 30, "a turkey's first strike is worth 30");
      t(scoreFrame(turkey, 1).value === 24, "the second strike borrows 10 + 4");
    }),

  () =>
    group("Unresolved frames stay honest", (t) => {
      // A pending strike is null, not a partial sum — a score that later
      // goes DOWN is worse than a score that is briefly blank.
      const pending = gameFromRolls([10]);
      t(scoreFrame(pending, 0).value === null, "a fresh strike has no value yet");
      t(!scoreFrame(pending, 0).resolved, "a fresh strike is unresolved");
      t(runningTotal(pending, 9) === 0, "runningTotal counts only resolved frames");
      const open = gameFromRolls([3, 4]);
      t(scoreFrame(open, 0).resolved, "an open frame resolves immediately");
      t(scoreFrame(open, 0).value === 7, "3,4 is 7");
    }),

  () =>
    group("The 10th frame's fill ball", (t) => {
      // Nine open frames, then the one frame that breaks its own rules.
      const nineOpen = Array.from({ length: 18 }, () => 0);
      const spareFill = gameFromRolls([...nineOpen, 7, 3, 5]);
      t(scoreFrame(spareFill, 9).value === 15, "a 10th-frame spare plus a 5 fill is 15");
      const doubleFill = gameFromRolls([...nineOpen, 10, 10, 10]);
      t(scoreFrame(doubleFill, 9).value === 30, "three 10th-frame strikes are 30");
      const openTenth = gameFromRolls([...nineOpen, 3, 4]);
      t(scoreFrame(openTenth, 9).value === 7, "an open 10th takes no fill ball");
      // A 9th-frame spare reaches into the 10th for its bonus.
      const ninthSpare = gameFromRolls([...Array.from({ length: 16 }, () => 0), 6, 4, 8, 1]);
      t(scoreFrame(ninthSpare, 8).value === 18, "a 9th-frame spare borrows the 10th's first roll");
    }),

  () =>
    group("Splits are geometry, not a list", (t) => {
      t(isSplit([7, 10] as PinId[]), "the 7–10 is a split");
      t(!isSplit([4, 5] as PinId[]), "4–5 is an adjacent leave, not a split");
      t(isSplit([2, 7] as PinId[]), "the baby split (2–7) is a split");
      t(!isSplit([1, 7, 10] as PinId[]), "the headpin standing means no split");
      t(!isSplit([10] as PinId[]), "a single pin is just a single pin");
      t(isSplit([4, 6, 7, 10] as PinId[]), "the Big Four is two clusters");
    }),

  () =>
    group("Standing pins survive a rack reset", (t) => {
      // Frame 10, strike then a 6-count: the rack RESETS mid-frame, so
      // "standing" must be walked, never subtracted.
      let g: Game = emptyGame();
      for (let i = 0; i < 18; i++) g = applyRoll(g, 0);
      g = applyRoll(g, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as PinId[]);
      g = applyRoll(g, [1, 2, 3, 5, 8, 9] as PinId[]);
      const frame = g.frames[9];
      t(standingAfter(frame, 0).length === 10, "after the strike a fresh rack stands");
      const leave = standingAfter(frame, 1);
      t(leave.join(",") === "4,6,7,10", `the fill ball's leave should be 4,6,7,10 — got ${leave.join(",")}`);
      // A count-only frame honestly reports a full rack rather than guessing.
      t(standingAfter({ rolls: [7] }, 0).length === 10, "a count-only frame does not invent a leave");
    }),

  () =>
    group("Autobowl is deterministic", (t) => {
      const a = simulateAutobowl(42);
      const b = simulateAutobowl(42);
      t(JSON.stringify(a) === JSON.stringify(b), "same seed must produce the identical game");
      // Pins-first: every roll's pinfall length equals its count, no pin twice.
      for (const [fi, frame] of a.frames.entries()) {
        for (const [ri, roll] of frame.rolls.entries()) {
          const fell = frame.pinfall?.[ri] ?? [];
          t(fell.length === roll, `frame ${fi + 1} roll ${ri + 1}: pinfall must match the count`);
          t(new Set(fell).size === fell.length, `frame ${fi + 1} roll ${ri + 1}: no pin falls twice`);
        }
      }
      // The demo guarantee: a gutter-grade roll appears in the first 3 frames.
      const early = a.frames.slice(0, 3).flatMap((f) => f.rolls);
      t(early.some((r) => isGutterTrigger(r)), "an early gutter-grade roll is guaranteed");
    }),

  () =>
    group("Target math reasons about bonuses", (t) => {
      // Eight 5/5 frames in: 105 on the board, two frames left. Raw pins
      // remaining (at most 30) say 150 is gone; bonus chaining says it is not.
      let g: Game = emptyGame();
      for (let i = 0; i < 16; i++) g = applyRoll(g, 5);
      const math = pinsNeededNextFrame(g, 150);
      t(math.framesRemaining === 2, "two frames remain");
      t(math.feasible, "150 is reachable with the remaining strikes chained");
      const gone = pinsNeededNextFrame(g, 200);
      t(!gone.feasible, "200 in two frames is gone, and the engine says so");
      t(isGutterTrigger(2) && !isGutterTrigger(3), "the gutter threshold sits at 2");
    }),

  () =>
    group("Two bowlers, one derived turn", (t) => {
      let m = emptyMatch(2);
      t(bowlerUp(m) === 0, "the first bowler in the roster is up");
      m = applyMatchRoll(m, 7);
      t(bowlerUp(m) === 0, "a leave keeps the lane — a second ball is owed");
      m = applyMatchRoll(m, 2);
      t(bowlerUp(m) === 1, "an open frame passes the lane");
      // A strike ends the frame after ONE ball — the case a turn counter has
      // to special-case. Nothing flips here; the frame index simply advanced.
      m = applyMatchRoll(m, 10);
      t(bowlerUp(m) === 0, "a strike passes it back after a single ball");

      // The 10th frame holds the lane for all three of its balls.
      const nineOpen = Array<number[]>(9).fill([4, 4]).flat();
      let tenth = matchFromRolls([nineOpen, nineOpen]);
      tenth = applyMatchRoll(tenth, 10);
      tenth = applyMatchRoll(tenth, 10);
      t(bowlerUp(tenth) === 0, "the 10th frame keeps the lane through its fills");
      tenth = applyMatchRoll(tenth, 10);
      t(bowlerUp(tenth) === 1, "and passes it only once the fills have landed");

      // The claim the whole match layer rests on: no lookback crosses a bowler
      // boundary, so interleaving two games cannot change either score.
      const a = simulateAutobowl(8);
      const b = simulateAutobowl(17);
      const queues = [allRolls(a), allRolls(b)];
      let match = emptyMatch(2);
      let guard = 0;
      while (!isMatchOver(match) && guard++ < 100) {
        const up = bowlerUp(match);
        if (up === null) break;
        const next = queues[up].shift();
        if (next === undefined) break;
        match = applyMatchRoll(match, next);
      }
      const [sa, sb] = matchScores(match);
      t(
        sa === totalScore(a) && sb === totalScore(b),
        `interleaved ${sa}/${sb} should equal solo ${totalScore(a)}/${totalScore(b)}`,
      );
    }),
];

export function runAll(): CheckResult[] {
  return CHECKS.map((c) => c());
}
