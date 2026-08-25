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

/** The house ball each bowler rolls — the lane tints the throw with it. */
export function bowlerBall(kind: BowlerKind): string {
  return kind === "alien" ? "#2c4438" : kind === "robot" ? "#3c2c4a" : "#1a7f96";
}
