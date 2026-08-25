# Bowling Engine

**Ten-pin scoring is a ledger that keeps rewriting the past. This plays it out correctly, frame by frame, including the one rule everybody forgets.**

Feed it rolls — live, taps, or autobowl — and it scores a real game: strikes
and spares held open until the frames that resolve them actually land, the
10th frame's fill-ball exception handled as a real rule instead of a
special case bolted on.

- **[Try it](https://johnfrog76.github.io/bowling-engine/)** — no install
- MIT licensed, framework-free core, full test coverage
- **Don't take our word for it — [run the tests yourself](https://johnfrog76.github.io/bowling-engine/#/)**,
  live, in your browser, from the landing page

---

## Two parts

Like every repo in this family, there's the **engine** and there's the
**GUI that consumes it** — same split as the decks this engine also drives.

- **The engine** (`src/engine.ts`) is the algorithm: pure functions, zero
  dependencies, zero UI. `scoreFrame`, `standingAfter` (the pins left after
  a roll), `isSplit`, `simulateAutobowl` — every rule below, and nothing
  else.
- **The GUI** (`src/pages/EnginePage.tsx`) is a small interactive scene
  built entirely on top of that engine — pick a bowler, set a skill level
  (it decides how many gutter balls and 7–10 splits you're in for), flip
  the lane to Starlight, roll or autobowl, watch the pins fall. It's the
  same relationship the two decks have to it, just a third, simpler
  consumer, live on this page.

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

## What it does not do

Stated rather than hidden:

| Concern | Status |
| --- | --- |
| Frame-by-frame scoring, all rules | Supported |
| Lookback (strike/spare bonus resolution) | Supported |
| 10th frame fill-ball exception | Supported |
| Chained strikes ("turkeys" and beyond) | Supported |
| Which pins are standing — leaves and splits (the 7-10) | Supported — an optional pin-identity layer; scoring itself only ever reads counts |
| Ball physics, hook, lane oil, pin carry | **Not supported — not the point** |
| Multiplayer / league history / persistence | **Not supported — score one game at a time** |

## Using the engine directly

```ts
import { applyRoll, scoreFrame, runningTotal, simulateAutobowl } from "./src/engine";

// Build a game one roll at a time — this is what manual entry drives.
let game = applyRoll({ frames: [] }, 7); // count-only roll
game = applyRoll(game, [2, 3]); // or a pin-identity roll: which pins fell

// ...or generate a full, plausible game in one call.
const autobowlGame = simulateAutobowl(42);
scoreFrame(autobowlGame, 0);
// { value: 19, resolved: true }

runningTotal(autobowlGame, 9);
// running total through the 10th frame
```

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run verify     # lint + typecheck + test
npm run shots
```

The live page also ships its own in-browser check suite (`Run the tests`
on the landing page) — a smaller, framework-free harness that calls these
same exported functions and shows real pass/fail counts. `npm test` is
still the authoritative suite CI gates on; the in-browser one exists so a
visitor can watch the guarantee proved instead of taking a badge's word
for it.

## Provenance

Extracted from a talk about bowling scoring as an algorithm, where the
engine drives two decks live — a coaching deck and a local-access broadcast
deck, both reading the same event stream.

## Licence

MIT.
