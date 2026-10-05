# Scoring rules

These are the rules the engine implements, each with the function in
[`src/engine.ts`](../src/engine.ts) that carries it. For why they are hard to get
right, see [How it works](how-it-works.md).

## The rules

- **A frame holds rolls and nothing else.** Frames 1–9 hold one or two rolls (a
  strike ends the frame after one). Frame 10 holds two or three — the third only
  when the first two earned a fill ball. Whether a frame is a strike, a spare or
  open is derived from its rolls (`isStrike`, `isSpare`, `isOpen`), never stored.
- **Open frame** — the two rolls, resolved immediately.
- **Spare** — 10 plus the next one roll. A first roll of 10 is never part of a
  spare, so the 10th frame's `10, 0` does not read as one.
- **Strike** — 10 plus the next two rolls. When the next frame is itself a strike
  it contributes only its single roll, so the second bonus roll comes from the
  frame after that. The engine reads bonuses from the game flattened into one roll
  list, which gets chained strikes right by construction (`scoreFrame`).
- **The 10th frame** has no frame to look ahead into, so it borrows nothing: its
  score is the sum of the two or three rolls it is entitled to, and it resolves
  when it has taken them all. The fill balls are the lookback, paid in advance.
  A perfect game is twelve strikes, 300 (`PERFECT_GAME`).
- **Unresolved is not an error.** A strike or spare whose bonus rolls have not
  landed scores `{ value: null, resolved: false }`.
- **Running totals count resolved frames only** (`runningTotal`, `totalScore`).
  A pending strike adds nothing rather than a partial sum, so a total never goes
  down.
- **Pins standing** for the next roll is walked roll by roll and resets whenever
  the rack is cleared, which the 10th frame can do mid-frame (`pinsStanding`).
- **A roll is an integer from 0 to 10**, or the list of pins it felled; anything
  else throws a `RangeError`. Rolls after the game is over are ignored.
- **Pin identity is optional and scoring never reads it.** A count-only game and
  a pin-tracked game of the same rolls score identically. Leaves (`standingAfter`)
  and splits (`isSplit`) are derived from it: a split is a leave with the headpin
  gone and the standing pins in two or more separate groups.

## What it does not do

Stated rather than hidden:

| Concern | Status |
| --- | --- |
| Frame-by-frame scoring, all rules | Supported |
| Lookback (strike/spare bonus resolution) | Supported |
| 10th frame fill-ball exception | Supported |
| Chained strikes ("turkeys" and beyond) | Supported |
| Which pins are standing — leaves and splits (the 7-10) | Supported — an optional pin-identity layer; scoring itself only ever reads counts |
| More than one bowler | Supported — N independent games, turn order derived rather than counted |
| Saving, restoring, undo, replay | Supported — a `Game` is plain JSON, with no layer required. See [Saving a game](engine-api.md#saving-a-game) |
| Ball physics, hook, lane oil, pin carry | **Not supported — not the point** |
| League standings, handicaps, season history | **Not supported — this scores games; it doesn't run a league** |
