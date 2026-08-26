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
