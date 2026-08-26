import type { BowlerKind } from "./roster";
import type { SkillLevel } from "./skill";

/**
 * What the room is set to, as data — kept apart from the drawer that renders
 * it, the same way `roster.ts` and `skill.ts` are kept apart from the art.
 * A consumer can read or persist a whole configuration without importing a
 * single component.
 *
 * (Named `settings.ts` rather than `controls.ts` on purpose: this repo builds
 * on a case-insensitive filesystem, where `controls.ts` and `Controls.tsx`
 * collide.)
 */

/** One bowler's settings. The roster is an array of these — add one, add a bowler. */
export interface PlayerConfig {
  kind: BowlerKind;
  skill: SkillLevel;
}

/** Room settings. One field per entry in `TOGGLES`. */
export interface Settings {
  starlight: boolean;
  autoRoll: boolean;
}

/**
 * The room's switches, declared rather than laid out.
 *
 * To add a setting: one entry here, one field on `Settings`. It renders
 * itself — labelled, in the right group, at a real touch size, on both
 * layouts. This list is the reason the controls moved into a drawer: a bar
 * could not have absorbed the next five of these, and there are always a next
 * five.
 */
export const TOGGLES: readonly { key: keyof Settings; label: string; hint: string }[] = [
  { key: "starlight", label: "Starlight bowling", hint: "Blacklight night — same lane, different room." },
  { key: "autoRoll", label: "Auto roll", hint: "The lane keeps bowling on its own clock." },
];

/**
 * How many can be at the line at once.
 *
 * A CEILING ON THE LAYOUT, NOT ON THE ENGINE. `Match.games` is an array and
 * `bowlerUp` derives rather than counts, so the algorithm is indifferent —
 * three or six bowl correctly today, untouched. Two is where the STAGE stops
 * being readable: a pair of lanes side by side is a match anyone recognises,
 * and a third lane makes all three too narrow to watch.
 *
 * Raising this is a layout decision, not an engine one — and the shape beyond
 * a head-to-head is team play (two teams of two, bowling order interleaved),
 * which wants a roster grouped into sides rather than a longer flat list. That
 * is a design worth doing properly rather than falling out of a bigger number
 * here.
 */
export const MAX_BOWLERS = 2;
export const MIN_BOWLERS = 1;

/** The default roster: one bowler, middle skill. */
export const DEFAULT_PLAYERS: readonly PlayerConfig[] = [{ kind: "dev", skill: "league" }];

/** The default room. */
export const DEFAULT_SETTINGS: Settings = { starlight: false, autoRoll: true };
