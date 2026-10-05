# Engine API

Everything here is exported from [`src/engine.ts`](../src/engine.ts). For the rules
these functions implement, see [Scoring rules](scoring.md).

## Using the engine directly

```ts
import { applyRoll, scoreFrame, runningTotal, simulateAutobowl } from "./src/engine";

// Build a game one roll at a time — this is what manual entry drives.
let game = applyRoll({ frames: [] }, 7); // count-only roll
game = applyRoll(game, [2, 3]); // or a pin-identity roll: which pins fell

// ...or generate a full, plausible game in one call.
const autobowlGame = simulateAutobowl(42);
scoreFrame(autobowlGame, 0);
// { value: 7, resolved: true } — seed 42 opens with an open frame, 6 then 1

runningTotal(autobowlGame, 9);
// 177 — the running total through the 10th frame
```

## More than one bowler

A match is N independent games and one derived question: who's up?

```ts
import { emptyMatch, bowlerUp, applyMatchRoll, matchScores } from "./src/engine";

let match = emptyMatch(2);
bowlerUp(match); // 0 — first in the roster
match = applyMatchRoll(match, 10); // a strike ends the frame after ONE ball...
bowlerUp(match); // 1 — ...so the lane passes, with no special case
matchScores(match); // [0, 0] — the strike is still waiting on its two bonus rolls

match = applyMatchRoll(match, 3); // bowler 1: 3...
match = applyMatchRoll(match, 4); // ...and 4, an open frame
matchScores(match); // [0, 7]
match = applyMatchRoll(match, 5); // bowler 0's next frame: 5...
match = applyMatchRoll(match, 2); // ...and 2 — the strike's bonus has landed
matchScores(match); // [24, 7] — strike 10 + 5 + 2, then 5 + 2
```

No scoring code changes, because **no lookback ever crosses a bowler
boundary** — a strike reaches into its own game's next two rolls and nowhere
else. So a match needs only a turn order, and the turn order is a fact about
the games rather than a counter beside them.

That distinction is the same one the rest of the engine makes. The obvious
implementation holds a `currentPlayer` and flips it when a frame ends — then
a strike ends a frame after one ball, so the flip needs a special case; then
the 10th frame takes three balls without passing the lane, so it needs
another. `bowlerUp` instead asks which game has the furthest to go. A strike
passes the lane because it completed a frame; the 10th frame holds the lane
because `currentFrameIndex` stays at 9 until the fill balls land. The frame
that breaks every other rule needs no special case here at all.

A match holds no names, skins, colours or lanes — a bowler is an index. Those
belong to whatever is presenting it. And a match of one is just `N = 1`; there
is no separate single-player path.

## Saving a game

There's no persistence layer because there's nothing to persist but data:

```ts
localStorage.setItem("game", JSON.stringify(game));
const restored: Game = JSON.parse(localStorage.getItem("game")!);
```

A `Game` is `{ frames: [{ rolls: [...] }] }` and nothing else — no class, no
methods, no cached `isStrike` or `frameScore` to rehydrate or to come back
stale. `gameFromRolls` rebuilds one from a flat roll list, every intermediate
game is a value you can keep for undo, and two games can be compared with a
deep equal. All of that is a consequence of never storing what can be derived,
which is why it costs nothing to offer.

## Exports at a glance

| Group | Exports |
| --- | --- |
| Model | `Game`, `Frame`, `Roll`, `PinId`, `FULL_RACK`, `emptyGame`, `gameFromRolls`, `applyRoll` |
| Derived facts | `isStrike`, `isSpare`, `isOpen`, `isFrameComplete`, `isGameOver`, `currentFrameIndex`, `allRolls`, `pinsStanding` |
| Scoring | `scoreFrame`, `runningTotal`, `totalScore`, `frameScores`, `FrameScore` |
| Pin identity | `standingAfter`, `isSplit` |
| Target math | `pinsNeededNextFrame`, `TargetMath`, `isGutterTrigger` |
| Mood | `classifyMood`, `Mood`, `BowlingEvent` |
| Simulation | `simulateAutobowl`, `mulberry32` |
| Matches | `Match`, `emptyMatch`, `matchFromRolls`, `bowlerUp`, `applyMatchRoll`, `isMatchOver`, `matchScores` |
| React adapter | `useBowlingSim`, `BowlingSimState`, `BowlingSimOpts` |
| Constants | `PIN_COUNT`, `FRAME_COUNT`, `LAST_FRAME_INDEX`, `GUTTER_THRESHOLD`, `PERFECT_GAME`, `ALWAYS_LIVE` |
