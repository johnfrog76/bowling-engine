# How it works

Bowling Engine is two things in one repository: a scoring engine, and a small
interactive scene that uses it. This page explains the split and the idea the
engine is built on. For the rules themselves see [Scoring rules](scoring.md);
for code see [Engine API](engine-api.md).

## Two parts

Like every repo in this family, there's the **engine** and there's the
**GUI that consumes it** — same split as the decks this engine also drives.

- **The engine** ([`src/engine.ts`](../src/engine.ts)) is the algorithm. Its core is
  framework-free TypeScript — pure functions, no UI, nothing imported. The
  same file also carries one thin React hook, `useBowlingSim`, which drives a
  game on a clock by calling those functions; it is the file's only use of
  React, so importing `src/engine.ts` does bring in the `react` package, while
  none of the scoring depends on it. `scoreFrame`, `standingAfter` (the pins left after
  a roll), `isSplit`, `simulateAutobowl` — every rule in
  [Scoring rules](scoring.md), and nothing else.
- **The GUI** ([`src/pages/EnginePage.tsx`](../src/pages/EnginePage.tsx)) is a small interactive scene
  built entirely on top of that engine — pick a bowler, set a skill level
  (it decides how many gutter balls and 7–10 splits you're in for), flip
  the lane to Starlight, roll or autobowl, watch the pins fall. It's the
  same relationship the two decks have to it, just a third, simpler
  consumer, [live on the demo site](https://johnfrog76.github.io/bowling-engine/).

## Why it exists

Bowling scoring looks simple until you have to code it. A strike's value
depends on rolls that haven't happened yet. A spare in the 9th frame can
reach into the 10th for its bonus. The 10th frame breaks its own rules on
purpose, on the last frame, because there's no 11th frame left to lend it
a lookback.

Most scoring bugs in bowling apps come from conflating two different
variables: how many pins are standing (resets every strike) versus how many
rolls have happened in the frame. This engine keeps them separate from the
start — a `Frame` holds rolls and nothing else; everything else (`isStrike`,
`isSpare`, the running score) is derived from them on demand.

The same idea carries the rest of the engine. Turn order in a match is derived
from the games rather than counted ([More than one bowler](engine-api.md#more-than-one-bowler)),
and a game saves as plain data because nothing derived is ever stored
([Saving a game](engine-api.md#saving-a-game)).
