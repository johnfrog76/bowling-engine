import {
  FRAME_COUNT,
  LAST_FRAME_INDEX,
  PIN_COUNT,
  allRolls,
  isOpen,
  isSpare,
  isStrike,
  totalScore,
  type Frame,
  type Game,
} from "../engine";

// ── What the game was ───────────────────────────────────────────────────────
//
// A finished game, read back as an explanation rather than a number.
//
// THIS IS NOT PART OF THE ENGINE, which is why it lives in `ui/` rather than
// beside `engine.ts`. That file scores bowling and earns trust by being narrow
// about what it does — its README's "what it does not do" table is a feature.
// None of this is scoring: it is analysis laid over a game the engine has
// already finished with, and nothing here adds a primitive, stores a flag, or
// can change a score.
//
// It is the MIRROR OF `skill.ts`, and sits beside it on purpose: skill is the
// page-side driver deciding what goes ONTO the lane, this is the page-side
// reader saying what came back off it. Neither belongs in the engine, both are
// pure, both are tested on their own.
//
// NO REACT IN HERE, and no colours or copy either. A summary reports which
// bowler leads a stat and by how much; whether that reads as "finds the pocket
// more consistently" — or as `8.4 pins` rather than `8.4` — is presentation,
// and it is packaged one file over in `useGameSummary`.
//
// NAMING: a component rendering this must NOT be called `Summary.tsx`. The repo
// builds on a case-insensitive filesystem where that collides with this file
// (TS1149) — the same trap that named `roster.ts` and `settings.ts`.
// `SummaryPanel.tsx` is clear.
//
// THE TENTH FRAME IS ONE FRAME, everywhere in here. It gets one first ball and
// one clean-frame verdict however many balls it actually took. Counting its
// fresh racks separately would weight the last frame three times as heavily as
// any other, and these are per-FRAME averages, not per-ball ones.

/**
 * A stat that a game with the wrong shape simply cannot answer.
 *
 * `null` is not zero, and the difference matters on the panel: a bowler who
 * never threw a mark has no mark efficiency, and reporting them as "0%
 * efficient at collecting bonuses" would be inventing a verdict out of an
 * absent question.
 */
export type Stat = number | null;

export interface GameSummary {
  /** The final score — `totalScore`, never re-derived here. */
  total: number;

  // ── the three the panel shows ────────────────────────────────────────────

  /**
   * ACCURACY: mean pins on the first ball of each frame, over ten frames.
   *
   * The tenth contributes its first ball only — the fill balls are a bonus
   * that was won, not a frame being opened.
   */
  firstBallAvg: Stat;

  /**
   * CONSISTENCY: frames that ended in a mark, over ten, as a percentage.
   *
   * `isStrike || isSpare` rather than `!isOpen`, because the two are not the
   * same question on an unfinished frame and this wants the affirmative one.
   */
  cleanFramePct: Stat;

  /**
   * CONVERSION: of the bonus these marks could have earned, how much was
   * collected.
   *
   * A strike is worth the next two balls against a maximum of twenty; a spare
   * the next one against a maximum of ten. The tenth frame counts the same way
   * with its FILL BALLS standing in for the lookback it has no frames left to
   * take — which is exactly what the fills are.
   *
   * Null when no mark was thrown: no marks, no bonus available, no ratio.
   */
  markEfficiencyPct: Stat;

  // ── computed, and deliberately not on the panel ──────────────────────────

  strikes: number;
  spares: number;
  opens: number;
  /** Pins left standing across every open frame — a positive count of waste. */
  openFrameCost: number;
  /**
   * Pins felled in the tenth over the pins that tenth actually earned: twenty
   * for an open tenth, thirty only when a third ball was won.
   */
  tenthClutchPct: Stat;
}

const pct = (part: number, whole: number): Stat => (whole === 0 ? null : (part / whole) * 100);

/** The marked-up frames, as the scoresheet reads them. */
const marks = (frame: Frame) => ({ strike: isStrike(frame), spare: isSpare(frame) });

/**
 * The bonus a mark collected, and the most it could have.
 *
 * Frames 1–9 look forward into the flat roll list, exactly as `scoreFrame`
 * does — the same lookback, asked a different question. The tenth looks at its
 * own fill balls instead, because it has nothing to look forward into.
 */
function bonusOf(game: Game, frameIndex: number): { earned: number; possible: number } | null {
  const frame = game.frames[frameIndex];
  if (!frame) return null;
  const { strike, spare } = marks(frame);
  if (!strike && !spare) return null;

  const possible = strike ? PIN_COUNT * 2 : PIN_COUNT;

  if (frameIndex === LAST_FRAME_INDEX) {
    const fills = frame.rolls.slice(1);
    const earned = fills.slice(0, strike ? 2 : 1).reduce((sum, r) => sum + r, 0);
    return { earned, possible };
  }

  const rolls = allRolls(game);
  let start = 0;
  for (let f = 0; f < frameIndex; f++) start += game.frames[f].rolls.length;
  const after = rolls.slice(start + frame.rolls.length, start + frame.rolls.length + (strike ? 2 : 1));
  return { earned: after.reduce((sum, r) => sum + r, 0), possible };
}

/**
 * Read a game back.
 *
 * Takes a game in ANY state — a game still being bowled answers about the
 * frames it has, which is what makes this safe to call from a live surface.
 * The averages divide by the frames actually thrown rather than by ten, so a
 * half-played game reports a real average of five frames instead of an average
 * silently halved by the frames that do not exist yet.
 */
export function summarise(game: Game): GameSummary {
  const frames = game.frames.slice(0, FRAME_COUNT);

  let firstBallSum = 0;
  let firstBalls = 0;
  let clean = 0;
  let strikes = 0;
  let spares = 0;
  let opens = 0;
  let openFrameCost = 0;
  let earned = 0;
  let possible = 0;

  frames.forEach((frame, i) => {
    if (frame.rolls.length > 0) {
      firstBallSum += frame.rolls[0];
      firstBalls += 1;
    }
    const { strike, spare } = marks(frame);
    if (strike) strikes += 1;
    if (spare) spares += 1;
    if (strike || spare) clean += 1;
    if (isOpen(frame)) {
      opens += 1;
      // What the frame left behind. On the tenth an open frame is still just
      // its two balls, so the same subtraction holds.
      openFrameCost += PIN_COUNT - (frame.rolls[0] + frame.rolls[1]);
    }
    const bonus = bonusOf(game, i);
    if (bonus) {
      earned += bonus.earned;
      possible += bonus.possible;
    }
  });

  const tenth = game.frames[LAST_FRAME_INDEX];

  return {
    total: totalScore(game),
    firstBallAvg: firstBalls === 0 ? null : firstBallSum / firstBalls,
    cleanFramePct: pct(clean, frames.length),
    markEfficiencyPct: pct(earned, possible),
    strikes,
    spares,
    opens,
    openFrameCost,
    tenthClutchPct: tenthClutch(tenth),
  };
}

/**
 * The tenth, on its own terms.
 *
 * The denominator is what that tenth EARNED, not a flat thirty: an open tenth
 * only ever offered twenty pins, and scoring it out of thirty would report a
 * bowler as having missed ten balls they were never given.
 */
function tenthClutch(frame: Frame | undefined): Stat {
  if (!frame || frame.rolls.length === 0) return null;
  const earnsFill = isStrike(frame) || isSpare(frame);
  return pct(
    frame.rolls.reduce((sum, r) => sum + r, 0),
    earnsFill ? PIN_COUNT * 3 : PIN_COUNT * 2,
  );
}

// ── Two games, side by side ─────────────────────────────────────────────────

/** Which stat, and which way round it reads. */
export type StatKey = "firstBallAvg" | "cleanFramePct" | "markEfficiencyPct" | "openFrameCost" | "tenthClutchPct";

export interface StatComparison {
  key: StatKey;
  values: Stat[];
  /**
   * Roster index of whoever leads, or null for a tie — and null ALSO when the
   * stat is unanswerable for anyone being compared. A bowler who threw no marks
   * has not lost mark efficiency; the question was not asked of them.
   */
  leader: number | null;
  /** How far apart the two are, in the stat's own units. Null when untied. */
  margin: Stat;
}

/** Stats where a SMALLER number is the better one. */
const LOWER_WINS: ReadonlySet<StatKey> = new Set<StatKey>(["openFrameCost"]);

/**
 * Compare one stat across a roster.
 *
 * Reports the fact — who leads, by how much — and stops there. What that fact
 * is worth saying out loud ("avoids costly open frames") is copy, and copy
 * belongs to the surface, not here.
 */
export function compareStat(summaries: readonly GameSummary[], key: StatKey): StatComparison {
  const values = summaries.map((s) => s[key] as Stat);
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2 || values.some((v) => v === null)) {
    return { key, values, leader: null, margin: null };
  }
  const best = LOWER_WINS.has(key) ? Math.min(...known) : Math.max(...known);
  const winners = values.flatMap((v, i) => (v === best ? [i] : []));
  if (winners.length !== 1) return { key, values, leader: null, margin: 0 };
  const rest = known.filter((v) => v !== best);
  const runnerUp = LOWER_WINS.has(key) ? Math.min(...rest) : Math.max(...rest);
  return { key, values, leader: winners[0], margin: Math.abs(best - runnerUp) };
}

/** The three the panel shows, in slot order: accuracy, consistency, conversion. */
export const PANEL_STATS: readonly StatKey[] = ["firstBallAvg", "cleanFramePct", "markEfficiencyPct"];
