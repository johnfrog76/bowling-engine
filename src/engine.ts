import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── bowling-engine ──────────────────────────────────────────────────────────
//
// A ten-pin SCORING engine. Not a physics sim, not a bowling app.
//
// THIS FILE IS THE DELIVERABLE, not scenery. It was extracted from a slide
// deck into its own open-source repo, so it holds to three rules:
//
//   1. ZERO imports from the deck it came from. Everything it needs — the
//      PRNG, the scoring walk, the target math — is inlined below. The
//      duplication is the price of being extractable, and it is cheap.
//   2. The core is framework-free. Everything above the "React adapter"
//      section is plain TypeScript and runs anywhere: Node, a worker, a
//      canvas, a test. React appears once, at the bottom, in a hook that is
//      trivially replaceable.
//   3. No consumer vocabulary leaks in. No character names, no palette
//      tokens, no slide numbers. A stranger should be able to read this file
//      and know it is a ten-pin scorer, and nothing about who is using it.
//
// WHAT IT IS FOR:
//
// Ten-pin scoring is a ledger that keeps rewriting the past. A strike's value
// depends on rolls that have not happened yet. A spare in the 9th frame
// reaches into the 10th for its bonus. The 10th frame breaks its own rules on
// purpose, because there is no 11th frame left to lend it a lookback.
//
// THE MODEL IS THE WHOLE ARGUMENT, and it is stated as a prohibition:
//
//   A `Frame` holds ROLLS AND NOTHING ELSE.
//
// No `isStrike` flag, no `isSpare` flag, no `frameScore`, no `rollCount`, no
// `gameOver`, no `frameIndex`, no `isLastFrame`. Every one of those is a FACT
// ABOUT the rolls, so every one of them is a pure function of the rolls, and
// the engine derives it on demand: `isStrike(frame)`, `isSpare(frame)`,
// `scoreFrame(game, i)`, `isGameOver(game)`.
//
// This is not minimalism for its own sake. The classic bowling-scorer bug is
// conflating two variables that look alike and diverge constantly: HOW MANY
// PINS ARE STANDING (resets on every strike) versus HOW MANY ROLLS HAVE
// HAPPENED IN THIS FRAME (one on a strike, two otherwise). Implementations
// that track both as mutable counters end up double-incrementing the roll
// count on a strike to fake frame advancement — and from then on the counter
// is a lie that every later rule has to be written around. Stored `isSpare`
// flags rot the same way: set during entry, read during scoring, and wrong
// forever if a roll is ever corrected. A running score accumulated during
// entry AND recomputed during scoring is two sources of truth that agree
// right up until they do not.
//
// So: never store what you can derive. `Game` is immutable — `applyRoll`
// returns a NEW `Game` — which means a game is a value, comparable, loggable,
// serialisable, and rewindable, and there is no entry-order-dependent state to
// get out of step with the score.
//
// THE ONE THING THAT IS RECORDED RATHER THAN DERIVED: which pins fell.
// "Seven pins went down" does not say which three are standing, and the gap
// between an ordinary 3-pin leave and the 7-10 split is not recoverable from
// a count — so `Frame.pinfall` records identities when a driver knows them.
// It is not an exception to the rule, it is the rule applied honestly: this
// is information, not a cached derivation. Everything downstream of it
// (`standingAfter`, `isSplit`) is still derived on demand and never stored.
//
// The boundary is strict and load-bearing: SCORING NEVER READS `pinfall`.
// Counts stay the single source of truth for `scoreFrame` and `runningTotal`,
// so a quick-entry count-only game and a fully pin-tracked game of the same
// rolls score identically, and pin identity can never drift the scoreboard.
//
// WHAT IT DOES NOT DO, stated rather than hidden: ball physics, hook, lane
// oil, pin carry, multiplayer, league history, persistence. `simulateAutobowl`
// produces a PLAUSIBLE game — a mid-skill bowler's distribution of strikes,
// spares and misses — not a physically simulated one.

// ── Running live ─────────────────────────────────────────────────────────────
//
// This engine was extracted from a slide deck, where a build-time flag
// decided whether the game animated live or fell back to a composed still:
// that deck ships onto a poster wall which freezes card animation, so a live
// timer loop would have been the one card moving among dozens of still ones.
//
// None of that applies here. This is a tool somebody drives, so it runs. The
// `enabled` option on `useBowlingSim` survives for callers that genuinely
// want to pause a simulation — offscreen, tab hidden, a screenshot script
// that needs a stable frame — which is a real need and a different one.
export const ALWAYS_LIVE = true;

// ── Constants ───────────────────────────────────────────────────────────────

/** Pins standing at the top of a frame. The only "10" that is a pin count. */
export const PIN_COUNT = 10;

/** Frames in a game. The 10th is the one that breaks the rules. */
export const FRAME_COUNT = 10;

/** Zero-based index of the last frame, where the fill-ball rule lives. */
export const LAST_FRAME_INDEX = FRAME_COUNT - 1;

/**
 * At or below this, a roll counts as a gutter-grade miss.
 *
 * Exported through `isGutterTrigger` rather than read directly, so callers ask
 * a named question instead of comparing against a bare number in five places.
 */
export const GUTTER_THRESHOLD = 2;

/** The theoretical maximum: twelve strikes. Twelve, not ten — the 10th frame owes two more. */
export const PERFECT_GAME = 300;

// ── Model ───────────────────────────────────────────────────────────────────

/** Pins felled by one roll, 0–10. */
export type Roll = number;

/**
 * A pin's identity on the rack, in standard numbering.
 *
 *         7  8  9  10      back row
 *           4  5  6
 *             2  3
 *               1          headpin, nearest the bowler
 *
 * COUNTS AND IDENTITIES ARE DIFFERENT FACTS, and this is the one place the
 * engine cannot derive one from the other. "Seven pins fell" does not say
 * WHICH three are standing, and the difference between a routine 3-pin leave
 * and the 7-10 split is the entire difference between an easy spare and a
 * famous one. So identity is recorded when it is known, and never invented.
 */
export type PinId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** A full rack, in pin order. */
export const FULL_RACK: readonly PinId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Which pins touch which, as a physical fact about the triangle.
 *
 * Two pins are adjacent if they are neighbours in the same row, or diagonal
 * neighbours one row apart — the pairs close enough that one falling pin can
 * take the other, or a ball can reach both. This graph is what makes `isSplit`
 * a derivation rather than a lookup table of famous leaves.
 */
const PIN_ADJACENCY: Readonly<Record<PinId, readonly PinId[]>> = {
  1: [2, 3],
  2: [1, 3, 4, 5],
  3: [1, 2, 5, 6],
  4: [2, 5, 7, 8],
  5: [2, 3, 4, 6, 8, 9],
  6: [3, 5, 9, 10],
  7: [4, 8],
  8: [4, 5, 7, 9],
  9: [5, 6, 8, 10],
  10: [6, 9],
};

/**
 * One frame's rolls, and NOTHING else.
 *
 * Frames 1–9 hold 1–2 rolls (a strike ends the frame after one). Frame 10
 * holds 2–3 — the third only exists when the first two earned a fill ball.
 *
 * There is deliberately no `isStrike`/`isSpare`/`score` field here. See the
 * file header: those are facts about `rolls`, and a stored fact is a fact that
 * can go stale.
 */
export interface Frame {
  rolls: Roll[];

  /**
   * Which pins fell on each roll — one array per entry in `rolls`.
   *
   * OPTIONAL ON PURPOSE, and the optionality is a contract, not a hedge.
   * Quick manual entry ("she got 7") knows a count and nothing more, and a
   * game recorded that way is completely valid: SCORING NEVER READS THIS
   * FIELD. Counts remain the single source of truth for `scoreFrame` and
   * `runningTotal`, so a count-only game and a pin-tracked game of the same
   * rolls score identically, and pin identity can never drift the score.
   *
   * Invariant when present: `pinfall[i].length === rolls[i]`, and no pin id
   * repeats within a rack cycle (the rack resets on a strike, at the start of
   * each frame, and per the 10th frame's fill-ball rules).
   */
  pinfall?: PinId[][];
}

/** A whole game: frames, in order. Immutable by convention — never mutate one. */
export interface Game {
  frames: Frame[];
}

/** An empty game. Frames appear as they are rolled, so this starts with none. */
export const emptyGame = (): Game => ({ frames: [] });

/** A game built from a flat list of rolls — the entry point every driver shares. */
export const gameFromRolls = (rolls: readonly Roll[]): Game =>
  rolls.reduce<Game>((g, pins) => applyRoll(g, pins), emptyGame());

// ── Derived facts ───────────────────────────────────────────────────────────
//
// Everything in this section is a pure function of `rolls`. None of it is ever
// stored on a Frame, which is why none of it can disagree with the rolls.

/** A strike is a first roll that felled everything. Derived, never flagged. */
export const isStrike = (frame: Frame): boolean => frame.rolls[0] === PIN_COUNT;

/**
 * A spare is two rolls summing to ten — and the first must NOT have been a
 * strike, or the 10th frame's `10, 0` would read as a spare.
 */
export const isSpare = (frame: Frame): boolean =>
  frame.rolls.length >= 2 && !isStrike(frame) && frame.rolls[0] + frame.rolls[1] === PIN_COUNT;

/** An open frame is a completed frame that left pins standing. */
export const isOpen = (frame: Frame): boolean =>
  frame.rolls.length >= 2 && !isStrike(frame) && !isSpare(frame);

/**
 * Is this frame finished being ROLLED? (Distinct from whether it is SCORED —
 * see `scoreFrame`. A strike in frame 3 is complete the instant it is thrown
 * and unresolved for two more rolls.)
 */
export function isFrameComplete(game: Game, frameIndex: number): boolean {
  const frame = game.frames[frameIndex];
  if (!frame) return false;
  if (frameIndex < LAST_FRAME_INDEX) return isStrike(frame) || frame.rolls.length >= 2;
  // The 10th frame earns a third roll iff its first two were a strike or a spare.
  const earnsFill = frame.rolls[0] === PIN_COUNT || frame.rolls[0] + frame.rolls[1] === PIN_COUNT;
  return frame.rolls.length >= (earnsFill ? 3 : 2);
}

/** The game is over when the 10th frame has taken every roll it is owed. */
export const isGameOver = (game: Game): boolean =>
  game.frames.length >= FRAME_COUNT && isFrameComplete(game, LAST_FRAME_INDEX);

/**
 * Which frame is taking the next roll — 0-based, or null when the game is done.
 *
 * NOTE THE ABSENCE OF A COUNTER. This is computed from how the frames actually
 * stand, which is why a strike does not need a phantom extra increment to
 * "advance the frame". The frame advances because the frame is complete.
 */
export function currentFrameIndex(game: Game): number | null {
  if (isGameOver(game)) return null;
  const last = game.frames.length - 1;
  if (last < 0) return 0;
  return isFrameComplete(game, last) ? last + 1 : last;
}

/** Every roll in the game, flattened in throw order — the lookback walks this. */
export const allRolls = (game: Game): Roll[] => game.frames.flatMap((f) => f.rolls);

/** Index into `allRolls` of the first roll of a given frame. */
function firstRollIndexOf(game: Game, frameIndex: number): number {
  let n = 0;
  for (let i = 0; i < frameIndex; i++) n += game.frames[i]?.rolls.length ?? 0;
  return n;
}

/**
 * Pins still standing for the next roll of the frame in progress.
 *
 * WALKS THE FRAME'S ROLLS RATHER THAN SUMMING THEM, and the distinction is the
 * whole reason this function exists. Summing is right only while one rack is
 * standing; in the 10th frame a rack can be CLEARED AND RESET mid-frame, so
 * `10 − sum(rolls)` goes negative the moment a strike is followed by a fill
 * ball (rolls `[10, 5]` sum to 15). Pins standing is a running state that
 * resets on every clear — never a subtraction over the frame's whole history.
 */
export function pinsStanding(game: Game, frameIndex: number): number {
  const frame = game.frames[frameIndex];
  if (!frame || isFrameComplete(game, frameIndex)) return PIN_COUNT;
  let standing = PIN_COUNT;
  for (const roll of frame.rolls) {
    standing -= roll;
    if (standing <= 0) standing = PIN_COUNT; // rack cleared, pins reset
  }
  return standing;
}

// ── Pin identity ────────────────────────────────────────────────────────────
//
// Everything here is derived from `pinfall` the same way scores are derived
// from `rolls`: standing pins are never stored, because a stored standing-set
// is one more thing that can disagree with the rolls that produced it.

/**
 * Which pins are standing after roll `rollIndex` of this frame.
 *
 * Returns the full rack when the frame records no pin identities — a
 * count-only frame genuinely does not know, and guessing a plausible leave
 * would be the engine inventing a fact a consumer would then render as true.
 *
 * Respects rack resets: clearing the rack stands all ten back up, which is
 * how the 10th frame's fill balls work and why this walks the rolls rather
 * than subtracting one cumulative set.
 */
export function standingAfter(frame: Frame, rollIndex: number): PinId[] {
  if (!frame.pinfall) return [...FULL_RACK];
  let standing = new Set<PinId>(FULL_RACK);
  for (let i = 0; i <= rollIndex && i < frame.pinfall.length; i++) {
    for (const pin of frame.pinfall[i]) standing.delete(pin);
    if (standing.size === 0) standing = new Set<PinId>(FULL_RACK); // rack reset
  }
  return FULL_RACK.filter((p) => standing.has(p));
}

/**
 * Is this leave a split?
 *
 * A split is the shot that is hard for a REASON, and the reason is geometric:
 * the headpin is gone, so there is nothing in the middle to carom off, and the
 * pins left standing are in two or more separate clusters with a gap between
 * them. One ball, two places to be.
 *
 * Derived from the adjacency graph rather than matched against a list of
 * famous leaves — which means the engine can state correctly that a leave
 * nobody has a name for is still a split. Connectivity is a flood fill from
 * any standing pin: if it cannot reach every other standing pin by touching
 * neighbours, the leave is in pieces.
 *
 * Names for particular splits are a matter of what a commentator calls them,
 * and belong to whatever is presenting this — not here.
 */
export function isSplit(standing: readonly PinId[]): boolean {
  // Headpin standing means the cluster has a middle: not a split, however
  // wide the gaps around it look.
  if (standing.includes(1)) return false;
  if (standing.length < 2) return false;

  const remaining = new Set<PinId>(standing);
  const stack: PinId[] = [standing[0]];
  remaining.delete(standing[0]);
  while (stack.length > 0) {
    const pin = stack.pop() as PinId;
    for (const neighbour of PIN_ADJACENCY[pin]) {
      if (remaining.delete(neighbour)) stack.push(neighbour);
    }
  }
  // Anything unreached is a second cluster — the gap that makes it a split.
  return remaining.size > 0;
}

// ── Building a game ─────────────────────────────────────────────────────────

/**
 * Apply one roll, returning a NEW game.
 *
 * The engine does not care whether the pins came from a tap, a socket, or the
 * autobowler — this is the single door every driver comes through.
 *
 * Takes EITHER a count or the actual pins felled. A count is quick entry and
 * records no identities; a `PinId[]` records the pinfall and derives the count
 * from its length, so the two can never disagree. Both produce the same score.
 *
 * Rolls past the end of the game are ignored rather than thrown, because a
 * held-down button on a finished game is a UI event, not a programmer error.
 */
export function applyRoll(game: Game, pins: Roll | readonly PinId[]): Game {
  const felled = Array.isArray(pins) ? ([...pins] as PinId[]) : null;
  // The count is DERIVED from the pin set when one is given — never passed
  // alongside it, so there is no second number to fall out of step.
  const count = felled ? felled.length : (pins as number);

  if (!Number.isInteger(count) || count < 0 || count > PIN_COUNT) {
    throw new RangeError(`roll must be an integer 0–${PIN_COUNT}, got ${count}`);
  }
  if (felled && new Set(felled).size !== felled.length) {
    throw new RangeError("a roll cannot fell the same pin twice");
  }

  const target = currentFrameIndex(game);
  if (target === null) return game;

  const frames: Frame[] = game.frames.map((f) => ({
    rolls: [...f.rolls],
    ...(f.pinfall ? { pinfall: f.pinfall.map((p) => [...p]) } : {}),
  }));
  while (frames.length <= target) frames.push({ rolls: [] });

  const frame = frames[target];
  if (felled) {
    // Pad for any earlier count-only rolls so pinfall stays index-aligned
    // with rolls — the invariant consumers rely on.
    const pinfall = frame.pinfall ?? frame.rolls.map(() => [] as PinId[]);
    pinfall.push(felled);
    frame.pinfall = pinfall;
  } else if (frame.pinfall) {
    frame.pinfall.push([]);
  }
  frame.rolls.push(count);
  return { frames };
}

// ── Scoring ─────────────────────────────────────────────────────────────────

/**
 * A frame's score, and whether it can be known yet.
 *
 * `resolved: false` with `value: null` is not an error state — it is the
 * ordinary condition of a strike or spare whose bonus rolls have not landed.
 * Consumers render that gap directly; it is the honest shape of the domain.
 */
export interface FrameScore {
  value: number | null;
  resolved: boolean;
}

const UNRESOLVED: FrameScore = { value: null, resolved: false };

/**
 * Score one frame, including its lookback bonus.
 *
 * Frames 1–9:
 *   - open   → the two rolls, resolved immediately.
 *   - spare  → 10 + the NEXT ONE roll.
 *   - strike → 10 + the NEXT TWO rolls, and this is where implementations go
 *     wrong: when the next frame is itself a strike it contributes only its
 *     own single roll, so the second bonus roll must be walked out of the
 *     frame AFTER that one. Flattening the game into a roll list and taking
 *     the next two entries gets this right by construction, which is why the
 *     lookback reads the flat list rather than hopping frame to frame.
 *
 * Frame 10 has no frame to look ahead into, so it borrows nothing: its score
 * is simply the sum of the 2–3 rolls it is entitled to, and it resolves when
 * it has taken them all. The fill balls ARE the lookback, paid in advance.
 */
export function scoreFrame(game: Game, frameIndex: number): FrameScore {
  const frame = game.frames[frameIndex];
  if (!frame || frameIndex < 0 || frameIndex > LAST_FRAME_INDEX) return UNRESOLVED;

  if (frameIndex === LAST_FRAME_INDEX) {
    if (!isFrameComplete(game, frameIndex)) return UNRESOLVED;
    const value = frame.rolls.reduce((sum, r) => sum + r, 0);
    return { value, resolved: true };
  }

  if (!isFrameComplete(game, frameIndex)) return UNRESOLVED;

  const rolls = allRolls(game);
  const start = firstRollIndexOf(game, frameIndex);

  if (isStrike(frame)) {
    const bonus = rolls.slice(start + 1, start + 3);
    if (bonus.length < 2) return UNRESOLVED;
    return { value: PIN_COUNT + bonus[0] + bonus[1], resolved: true };
  }

  if (isSpare(frame)) {
    const bonus = rolls[start + 2];
    if (bonus === undefined) return UNRESOLVED;
    return { value: PIN_COUNT + bonus, resolved: true };
  }

  return { value: frame.rolls[0] + frame.rolls[1], resolved: true };
}

/**
 * Cumulative score through a frame, counting ONLY resolved frames.
 *
 * An unresolved frame contributes nothing — not a partial sum, not the pins so
 * far. Half-crediting a pending strike is how a scoreboard ends up showing a
 * number that later goes DOWN, and a score that moves backwards is worse than
 * a score that is briefly blank.
 */
export function runningTotal(game: Game, throughFrameIndex: number): number {
  let total = 0;
  const last = Math.min(throughFrameIndex, LAST_FRAME_INDEX);
  for (let i = 0; i <= last; i++) {
    const { value, resolved } = scoreFrame(game, i);
    if (resolved && value !== null) total += value;
  }
  return total;
}

/** The whole game's score so far — every resolved frame. */
export const totalScore = (game: Game): number => runningTotal(game, LAST_FRAME_INDEX);

/** Every frame's score, in order — what a scoreboard row renders. */
export const frameScores = (game: Game): FrameScore[] =>
  Array.from({ length: FRAME_COUNT }, (_, i) => scoreFrame(game, i));

// ── Target math ─────────────────────────────────────────────────────────────

/**
 * What it would take to reach a goal, and whether it is still reachable.
 *
 * `pinsNeeded` is the honest gap: `goalScore − runningTotal`, never clamped
 * upward into false hope, floored at 0 once the goal is met.
 *
 * `feasible` is the part that has to REASON rather than subtract. Raw pins
 * remaining is the wrong yardstick, because pins are not the currency —
 * BONUSES are. A strike in a frame is worth 10 plus the next two rolls, so
 * three frames left is worth far more than thirty pins. The best case is
 * computed the only reliable way: play out the remainder of the game with
 * every remaining roll a strike, score it with this same engine, and see
 * where it lands. Anything less than that is a rule of thumb that will be
 * wrong somewhere near the end of a game — which is precisely where anyone
 * asks the question.
 */
export interface TargetMath {
  pinsNeeded: number;
  framesRemaining: number;
  feasible: boolean;
}

export function pinsNeededNextFrame(game: Game, goalScore: number): TargetMath {
  const current = currentFrameIndex(game);
  const framesRemaining = current === null ? 0 : FRAME_COUNT - current;
  const pinsNeeded = Math.max(goalScore - totalScore(game), 0);

  // Best case: finish the game throwing nothing but strikes, and score THAT.
  // Using the engine on itself keeps this in step with the scoring rules for
  // free — including the 10th frame's fill balls, which is where a hand-rolled
  // estimate would go astray.
  let best = game;
  let guard = 0;
  while (!isGameOver(best) && guard++ < 40) best = applyRoll(best, PIN_COUNT);

  return { pinsNeeded, framesRemaining, feasible: totalScore(best) >= goalScore };
}

/** A gutter-grade roll: nothing in the pocket. */
export const isGutterTrigger = (roll: Roll): boolean => roll <= GUTTER_THRESHOLD;

// ── Mood ────────────────────────────────────────────────────────────────────

/**
 * Five states a consumer can render off.
 *
 * DELIBERATELY DOMAIN-NEUTRAL NAMES. A presentation layer will have its own
 * vocabulary for these — palette tokens, overlay copy, a mascot's face — and
 * that vocabulary belongs to the presentation layer, not here. Consumers map
 * these five onto whatever they show; the engine only says which one is true.
 *
 *   idle        nothing has happened worth reacting to.
 *   coaching    the bowler asked a question — instruction, target math.
 *   rage        a gutter-grade roll landed.
 *   celebration a strike, or a frame that resolved well.
 *   suspense    a fill ball is pending: the 10th frame, still owed a roll.
 */
export type Mood = "idle" | "coaching" | "rage" | "celebration" | "suspense";

/**
 * What just happened, as a small closed set of domain events.
 *
 * `teaching` is CONSUMER-INITIATED and therefore must arrive as an event: no
 * arrangement of pins on a lane means "explain this to me." Inferring a
 * teaching moment from game state would be the engine guessing at intent,
 * which is the exact thing this function exists to stop.
 */
export type BowlingEvent =
  | { kind: "idle" }
  /** A roll landed, felling `pins`. */
  | { kind: "roll"; pins: Roll }
  /** A frame finished being rolled. */
  | { kind: "frameResolved"; frameIndex: number }
  /** Instruction or target math was requested by the person using it. */
  | { kind: "teaching" };

/**
 * Classify the mood. Pure: same game and event, same answer, every time.
 *
 * Order matters and is the priority, not an accident:
 *   1. A request to teach outranks the scoreboard — someone asked.
 *   2. A gutter roll outranks everything else that just happened.
 *   3. A strike is worth celebrating on its own.
 *   4. A resolved frame celebrates if it earned a bonus, otherwise idles.
 *   5. An unfinished last frame is suspense — the fill ball is still owed.
 */
export function classifyMood(game: Game, event: BowlingEvent): Mood {
  if (event.kind === "teaching") return "coaching";

  if (event.kind === "roll") {
    if (isGutterTrigger(event.pins)) return "rage";
    if (event.pins === PIN_COUNT) return "celebration";
  }

  if (event.kind === "frameResolved") {
    const frame = game.frames[event.frameIndex];
    if (frame && (isStrike(frame) || isSpare(frame))) return "celebration";
    return "idle";
  }

  // A tenth frame that has begun and is still owed a roll is the one place the
  // game holds its breath: there is no next frame to make up for it.
  const last = game.frames[LAST_FRAME_INDEX];
  if (last && last.rolls.length > 0 && !isFrameComplete(game, LAST_FRAME_INDEX)) return "suspense";

  return "idle";
}

// ── Deterministic simulation ────────────────────────────────────────────────

/**
 * mulberry32 — a small, fast, seeded PRNG.
 *
 * INLINED AND SEEDED BECAUSE `Math.random` WOULD MAKE THIS UNREVIEWABLE. A
 * still frame built from "whatever the RNG gave us at build time" cannot be
 * checked, cannot be reproduced from a bug report, and cannot be asserted in a
 * test. Same seed, same game, always.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mid-skill bowler's first-ball distribution. Not physics — a plausible spread. */
const STRIKE_RATE = 0.32;
const GUTTER_RATE = 0.12;

/** Within the first this-many frames, one gutter-grade roll is guaranteed. */
const EARLY_GUTTER_FRAMES = 3;

/**
 * How likely each pin is to survive a ball that does not clear the rack.
 *
 * PINS-FIRST, NOT COUNT-FIRST. Picking a count and then choosing that many
 * random pins produces leaves no bowler has ever seen — scattered singles all
 * over the rack. Real leaves have a shape: the ball enters near the headpin
 * and its energy runs out toward the back corners, so the 7 and the 10 are the
 * pins left standing far more often than the 5 in the middle. Weighting
 * survival this way makes the LEAVE plausible, and the count then falls out of
 * however many pins actually went down.
 *
 * Not a carry model — no pin-to-pin momentum, no deflection. A plausible
 * distribution, honestly labelled.
 */
const PIN_SURVIVAL: Readonly<Record<PinId, number>> = {
  1: 0.05, // headpin: the ball's first contact
  2: 0.16,
  3: 0.16,
  4: 0.3,
  5: 0.12, // dead centre, taken by almost anything
  6: 0.3,
  7: 0.55, // back corners survive most often — the classic leaves
  8: 0.24,
  9: 0.24,
  10: 0.55,
};

/**
 * A plausible random game, deterministic under `seed`.
 *
 * Simulates WHICH PINS FALL and derives the counts from that, so every frame
 * carries a real leave a renderer can draw and `isSplit` can judge. The
 * distribution is a mid-skill bowler's: about a third of first balls strike,
 * most of the rest leave a makeable spare, and a few are gutter-grade misses.
 * No ball physics, no carry model — the point is a game that LOOKS like a real
 * one on a scoreboard and a lane, not one that was bowled.
 *
 * THE EARLY-GUTTER BIAS is a product decision, not a modelling one: a demo
 * that only sometimes shows a bad roll is a demo that sometimes cannot show
 * what it is about. So if no gutter-grade roll has appeared by the end of the
 * `EARLY_GUTTER_FRAMES`th frame, one is forced. It is stated here rather than
 * hidden because a biased sampler that does not admit it is a trap for the
 * next reader.
 */
export function simulateAutobowl(seed = 1): Game {
  const rand = mulberry32(seed);
  let game = emptyGame();
  let sawEarlyGutter = false;

  /** Knock down `want` pins from those standing, favouring the ones a ball reaches first. */
  const pick = (standing: readonly PinId[], want: number): PinId[] => {
    const order = [...standing]
      .map((pin) => ({ pin, key: rand() * PIN_SURVIVAL[pin] }))
      .sort((a, b) => a.key - b.key); // lowest survival falls first
    return order.slice(0, want).map((e) => e.pin);
  };

  while (!isGameOver(game)) {
    const frameIndex = currentFrameIndex(game);
    if (frameIndex === null) break;

    const frame = game.frames[frameIndex];
    const rollIndex = frame ? frame.rolls.length : 0;
    const standing: PinId[] = frame && rollIndex > 0 ? standingAfter(frame, rollIndex - 1) : [...FULL_RACK];
    const atFullRack = standing.length === PIN_COUNT;
    const early = frameIndex < EARLY_GUTTER_FRAMES;

    // Force the guarantee on the LAST first-ball of the early window, so the
    // bias costs at most one roll and never fights the rest of the game.
    const mustGutter = !sawEarlyGutter && atFullRack && frameIndex === EARLY_GUTTER_FRAMES - 1;

    let want: number;
    if (mustGutter) {
      want = Math.floor(rand() * (GUTTER_THRESHOLD + 1));
    } else if (atFullRack) {
      const r = rand();
      if (r < STRIKE_RATE) want = PIN_COUNT;
      else if (r < STRIKE_RATE + GUTTER_RATE) want = Math.floor(rand() * (GUTTER_THRESHOLD + 1));
      else want = 4 + Math.floor(rand() * 5); // a makeable leave: 4–8
    } else {
      // Spare attempt: usually clears what is left, sometimes not.
      const r = rand();
      want = r < 0.55 ? standing.length : Math.floor(rand() * (standing.length + 1));
    }

    const felled = pick(standing, Math.min(want, standing.length));
    if (early && isGutterTrigger(felled.length)) sawEarlyGutter = true;
    game = applyRoll(game, felled);
  }

  return game;
}

// ── More than one bowler ────────────────────────────────────────────────────
//
// A match is N independent games and ONE derived question: who is up?
//
// Nothing about scoring changes, and that is the point. No lookback ever
// crosses a bowler boundary — a strike in one game reaches into that same
// game's next two rolls and nowhere else — so a match needs no scoring code of
// its own. It needs a turn order, and a turn order is a FACT ABOUT THE GAMES.
//
// WHICH MEANS THERE IS NO TURN COUNTER, for exactly the reason there is no
// frame counter. The obvious implementation holds a `currentPlayer` and flips
// it when a frame ends — and then a strike ends a frame after ONE roll, so the
// flip has to be special-cased, and the 10th frame takes three rolls without
// passing the lane at all, so that needs a second special case, and from there
// the counter is a lie every later rule is written around. It is the same bug
// as the double-incremented roll count, one level up.
//
// So `bowlerUp` derives it: the bowler up is the one with the FURTHEST TO GO.
// A strike passes the lane because it completed a frame, which advanced that
// game's `currentFrameIndex` past everyone else's — not because anything was
// told to flip. The 10th frame keeps the lane for all three of its balls
// because `currentFrameIndex` stays at 9 until the fill balls land. The frame
// that breaks every other rule needs no special case here at all.
//
// WHAT A MATCH DELIBERATELY DOES NOT HOLD: names, skins, colours, lanes,
// handicaps, or standings. A bowler IS an index. Which lane they stand on and
// what they are called belong to whatever is presenting this — the same
// boundary the rest of the file keeps.

/**
 * N games in progress, bowled in turn. One game is a match of one, and behaves
 * exactly as it did before — there is no separate single-player path.
 */
export interface Match {
  games: Game[];
}

/** A match of `bowlerCount` empty games. */
export const emptyMatch = (bowlerCount: number): Match => ({
  games: Array.from({ length: Math.max(1, bowlerCount) }, () => emptyGame()),
});

/** A match built from one flat roll list per bowler — the test/replay entry point. */
export const matchFromRolls = (perBowler: readonly (readonly Roll[])[]): Match => ({
  games: perBowler.map((rolls) => gameFromRolls(rolls)),
});

/**
 * Whose turn it is — an index into `games`, or null when every game is over.
 *
 * The bowler up is the one whose game has the furthest to go, ties broken by
 * position in the roster, and a finished game is never up. That is the whole
 * rule; everything a turn counter would need a special case for falls out of
 * it, because `currentFrameIndex` already knows when a frame is done.
 */
export function bowlerUp(match: Match): number | null {
  let up: number | null = null;
  let furthest = Infinity;
  for (let i = 0; i < match.games.length; i++) {
    const frame = currentFrameIndex(match.games[i]);
    if (frame === null) continue; // done bowling — the lane skips them
    if (frame < furthest) {
      furthest = frame;
      up = i;
    }
  }
  return up;
}

/**
 * Apply one roll to whoever is up, returning a NEW match.
 *
 * The caller decides `bowlerUp` before it rolls, so it already knows who threw
 * — which is why nothing here records it. "Who rolled last" is not stored for
 * the same reason `isStrike` is not stored.
 *
 * Rolls into a finished match are ignored, matching `applyRoll`.
 */
export function applyMatchRoll(match: Match, pins: Roll | readonly PinId[]): Match {
  const up = bowlerUp(match);
  if (up === null) return match;
  const games = match.games.map((g, i) => (i === up ? applyRoll(g, pins) : g));
  return { games };
}

/** Every game finished. */
export const isMatchOver = (match: Match): boolean => bowlerUp(match) === null;

/** Each bowler's score so far, in roster order. */
export const matchScores = (match: Match): number[] => match.games.map(totalScore);

// ── React adapter ───────────────────────────────────────────────────────────
//
// The ONLY React in this file, and deliberately thin: a consumer using Vue,
// Svelte, or plain canvas replaces this hook with a loop over `applyRoll` and
// loses nothing. Note what is NOT here — no scoring, no mood, no rules. This
// hook owns a clock and a `Game` reference; every question it answers, it
// answers by calling the pure functions above.

export interface BowlingSimState {
  game: Game;
  /** Which frame is taking the next roll, or null when the game is over. */
  frameIndex: number | null;
  /** Every frame's score — unresolved frames carry `value: null`. */
  scores: FrameScore[];
  total: number;
  gameOver: boolean;
  mood: Mood;
  /**
   * Manual driver: apply one roll, as a count (quick entry) or the actual
   * pins felled (pin-tracked entry). A no-op in autobowl mode.
   */
  roll: (pins: Roll | readonly PinId[]) => void;
  /** Start over — a fresh game from the same seed in autobowl mode. */
  reset: () => void;
}

export interface BowlingSimOpts {
  /** Static/frozen surface: return null so the caller renders its still. */
  frozen?: boolean;
  /** Opt in explicitly; defaults to always-live (see "Running live" above). */
  enabled?: boolean;
  /** Autobowl seed — same seed, same game. */
  seed?: number;
  /** Milliseconds between autobowled rolls. */
  rollIntervalMs?: number;
}

/**
 * Drive a game, either autobowled on a clock or one manual roll at a time.
 *
 * Returns null when `enabled` is false OR when `frozen` is set, which is how a
 * static surface falls back to composed art. Callers MUST handle null.
 *
 * BOTH MODES ARE THE SAME ENGINE. Autobowl replays a precomputed deterministic
 * game roll by roll; manual pushes rolls in from input (a roll button, or a
 * tap-the-pins pad). Neither is a separate scoring path, and the core has no
 * idea which one produced the `Game` it is handed.
 */
export function useBowlingSim(
  mode: "autobowl" | "manual",
  opts: BowlingSimOpts = {},
): BowlingSimState | null {
  const { frozen = false, enabled = ALWAYS_LIVE, seed = 1, rollIntervalMs = 900 } = opts;
  const live = enabled && !frozen;

  const [game, setGame] = useState<Game>(emptyGame);
  const [mood, setMood] = useState<Mood>("idle");
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // The full autobowled game is computed ONCE, up front, and then revealed one
  // roll at a time. Sampling a fresh random roll per tick would make the game
  // depend on how long the tab stayed open, which is the non-determinism the
  // seed exists to remove.
  // Replays the PIN SETS, not the counts, so a live autobowl carries the same
  // leaves a renderer would draw from the precomputed game.
  const scripted = useMemo<PinId[][]>(() => {
    if (mode !== "autobowl") return [];
    const game = simulateAutobowl(seed);
    return game.frames.flatMap((f) => f.pinfall ?? f.rolls.map(() => [] as PinId[]));
  }, [mode, seed]);

  const roll = useCallback(
    (pins: Roll | readonly PinId[]) => {
      if (mode !== "manual") return;
      const count = Array.isArray(pins) ? pins.length : (pins as number);
      setGame((g) => {
        const next = applyRoll(g, pins);
        setMood(classifyMood(next, { kind: "roll", pins: count }));
        return next;
      });
    },
    [mode],
  );

  const reset = useCallback(() => {
    setGame(emptyGame());
    setMood("idle");
  }, []);

  useEffect(() => {
    if (!live || mode !== "autobowl") return;
    // REBUILT FROM THE SCRIPT EACH TICK, not accumulated onto whatever was in
    // state. Replaying the first `i` rolls of a deterministic script makes the
    // rendered game a pure function of (seed, tick), so a seed change starts
    // cleanly on the next tick without a synchronous reset in the effect body
    // — the cascading-render smell that setting state here would be. The
    // engine is immutable and the games are ten frames long, so replaying is
    // cheap and there is no stale-accumulation path to get wrong.
    let i = 0;
    timer.current = setInterval(() => {
      if (i >= scripted.length) {
        if (timer.current !== undefined) clearInterval(timer.current);
        return;
      }
      const felled = scripted[i++];
      const next = scripted.slice(0, i).reduce<Game>((g, pins) => applyRoll(g, pins), emptyGame());
      setGame(next);
      setMood(classifyMood(next, { kind: "roll", pins: felled.length }));
    }, rollIntervalMs);
    return () => {
      if (timer.current !== undefined) clearInterval(timer.current);
    };
  }, [live, mode, scripted, rollIntervalMs]);

  if (!live) return null;

  return {
    game,
    frameIndex: currentFrameIndex(game),
    scores: frameScores(game),
    total: totalScore(game),
    gameOver: isGameOver(game),
    mood,
    roll,
    reset,
  };
}
