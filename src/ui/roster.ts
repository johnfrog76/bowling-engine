/**
 * The roster, as data — who can be at the line, and the ball each one throws.
 * Kept apart from the drawing code the same way `avatars.ts` is in
 * juggling-engine, so a picker can enumerate the roster without importing art.
 */
export type BowlerKind = "alien" | "robot" | "dev";

export const BOWLER_KINDS: readonly BowlerKind[] = ["alien", "robot", "dev"];

export function bowlerLabel(kind: BowlerKind): string {
  return kind === "alien" ? "Alien" : kind === "robot" ? "Robot" : "Dev";
}

/**
 * A bowler's colour where CHROME needs one — the cap on their cut-in, the bar
 * on their name plate, the rule on their scorecard chip.
 *
 * NOT the ball tint, and the difference matters. Those are resin colours,
 * picked to look like a ball sitting in somebody's hands: the alien's is
 * #2c4438 and the robot's #3c2c4a, both a shade off black, which is right for
 * a sphere in a lit room and useless as a 4px rule on a dark panel — it would
 * simply vanish. These are the same three identities pitched up to where they
 * read as signal, and kept far enough apart that two bowlers on one screen are
 * never a guess.
 *
 * Starlight leaves them alone. The lit balls change because the ROOM changed;
 * the chrome is not in the room.
 */
export function bowlerChrome(kind: BowlerKind): string {
  return kind === "alien" ? "#7ee787" : kind === "robot" ? "#a78bfa" : "#4fc3d9";
}

/**
 * The house ball each bowler rolls — the lane tints the throw with it.
 *
 * TWO BALLS PER BOWLER, because a bowling alley genuinely hands you a
 * different one on cosmic night. The classic-night colours are deep resin
 * that reads against lit maple; under blacklight those go black, so the
 * starlight set is UV-reactive — the same three tones the room is already lit
 * with, which is why the ball looks like it belongs to the night rather than
 * like a bright dot pasted onto it.
 *
 * The hues track their daylight originals where they can (the alien's green
 * to cyan, the robot's purple to violet) and the dev takes the remaining UV
 * tone rather than a second cyan — the ball's colour is how you tell whose
 * throw is travelling, so two bowlers must never share one.
 */
export function bowlerBall(kind: BowlerKind, starlight = false): string {
  if (starlight) {
    return kind === "alien" ? "#5ff0e8" : kind === "robot" ? "#a58cff" : "#ff5fd2";
  }
  return kind === "alien" ? "#2c4438" : kind === "robot" ? "#3c2c4a" : "#1a7f96";
}
