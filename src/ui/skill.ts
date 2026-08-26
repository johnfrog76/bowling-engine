import type { PinId } from "../engine";

/**
 * Skill levels for the engine page's driver — the knob that decides how many
 * gutter balls and 7–10 splits a session serves.
 *
 * THIS IS A DRIVER, NOT A SECOND SCORING PATH. Every roll produced here goes
 * through the same `applyRoll` door as a tap or the built-in autobowl; the
 * engine neither knows nor cares which skill generated the `Game` it scores.
 * The distribution mirrors the shape of the engine's own `simulateAutobowl`
 * (pins-first, survival-biased so leaves look real), re-parameterised per
 * skill — and unlike the engine's seeded generator, this one is allowed to be
 * random: it drives a live page, not a reviewable still.
 */
export type SkillLevel = "rookie" | "league" | "pro";

export const SKILL_LEVELS: readonly SkillLevel[] = ["rookie", "league", "pro"];

export function skillLabel(s: SkillLevel): string {
  return s === "rookie" ? "Rookie" : s === "league" ? "League" : "Pro";
}

/**
 * What a skill level has to show for itself — the metal on the shelf.
 *
 * A rookie has only the ball. Kept here beside the levels rather than in the
 * art, so the drawer's picker and the figure on the lane can never disagree
 * about what League looks like.
 */
export type TrophyMetal = "silver" | "gold";

export function skillTrophy(s: SkillLevel): TrophyMetal | null {
  return s === "pro" ? "gold" : s === "league" ? "silver" : null;
}

interface SkillProfile {
  /** first-ball chance of a strike */
  strike: number;
  /** first-ball chance of a gutter-grade roll (0–2 pins) */
  gutter: number;
  /** first-ball chance of leaving exactly the 7–10 */
  sevenTen: number;
  /** chance a spare attempt clears whatever is left */
  spareClear: number;
  /** the ordinary first-ball count range, inclusive */
  lo: number;
  hi: number;
}

const PROFILES: Record<SkillLevel, SkillProfile> = {
  rookie: { strike: 0.08, gutter: 0.34, sevenTen: 0.12, spareClear: 0.28, lo: 3, hi: 7 },
  league: { strike: 0.32, gutter: 0.12, sevenTen: 0.05, spareClear: 0.55, lo: 4, hi: 8 },
  pro: { strike: 0.6, gutter: 0.02, sevenTen: 0.01, spareClear: 0.85, lo: 7, hi: 9 },
};

/**
 * How likely each pin is to survive a ball that does not clear the rack —
 * the ball enters near the headpin and its energy runs out toward the back
 * corners, so the 7 and the 10 survive far more often than the 5.
 * Mirrors the engine's own autobowl bias.
 */
const SURVIVAL: Record<PinId, number> = {
  1: 0.05,
  2: 0.16,
  3: 0.16,
  4: 0.3,
  5: 0.12,
  6: 0.3,
  7: 0.55,
  8: 0.24,
  9: 0.24,
  10: 0.55,
};

/** Knock down `want` pins from those standing, favouring the ones a ball reaches first. */
function pick(standing: readonly PinId[], want: number): PinId[] {
  return [...standing]
    .map((pin) => ({ pin, key: Math.random() * SURVIVAL[pin] }))
    .sort((a, b) => a.key - b.key)
    .slice(0, Math.min(want, standing.length))
    .map((e) => e.pin);
}

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** One plausible roll at the given skill: WHICH pins fall, count derived. */
export function rollForSkill(skill: SkillLevel, standing: readonly PinId[]): PinId[] {
  const p = PROFILES[skill];
  const atFullRack = standing.length === 10;
  const r = Math.random();

  if (atFullRack) {
    if (r < p.strike) return [...standing];
    if (r < p.strike + p.gutter) return pick(standing, randInt(0, 2));
    if (r < p.strike + p.gutter + p.sevenTen) {
      // The famous one: everything goes down except the back corners.
      return standing.filter((pin) => pin !== 7 && pin !== 10);
    }
    return pick(standing, randInt(p.lo, p.hi));
  }

  // Spare attempt: clears at the skill's rate, otherwise chips at the leave.
  if (r < p.spareClear) return [...standing];
  return pick(standing, randInt(0, standing.length));
}
