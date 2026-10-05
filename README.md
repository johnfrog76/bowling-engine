```text
               .-.     .-.     .-.     .-.
               | |     | |     | |     | |
               /_\     /_\     /_\     /_\
                   .-.     .-.     .-.
                   | |     | |     | |
                   /_\     /_\     /_\
                       .-.     .-.
                       | |     | |
                       /_\     /_\
                           .-.
                           | |
                           /_\

           ===================================
               B O W L I N G   E N G I N E
           ===================================
```

<p align="center"><em>A ten-pin scoring engine that holds every strike open until the rolls that pay for it land.</em></p>

**Ten-pin scoring is a ledger that keeps rewriting the past. Bowling Engine plays it out
correctly, frame by frame, including the one rule everybody forgets.** Feed it rolls — live,
taps, or autobowl — and it scores a real game: strikes and spares held open until the frames
that resolve them actually land, the 10th frame's fill-ball exception handled as a real rule
instead of a special case bolted on.

**What you get** is a scoring engine in one TypeScript file of pure functions — rolls in,
scores out, with leaves and splits, more than one bowler, and a seeded autobowler — plus a
small interactive lane built entirely on top of it, and a check suite you can run in the
browser. A game is plain JSON, so saving, undo and replay need nothing extra.

**It is for** anyone who has to keep score in code and wants the bonuses right the first
time, and for anyone curious why a game this simple trips up so many implementations. The
engine is framework-free at its core; the lane is just one consumer of it.

- **[Try it](https://johnfrog76.github.io/bowling-engine/)** — no install
- **Don't take our word for it — [run the tests yourself](https://johnfrog76.github.io/bowling-engine/#/)**,
  live, in your browser, from the landing page
- [MIT licensed](LICENSE) · framework-free core · tested with Jest, and CI runs lint,
  typecheck and the tests on every pull request; the live site does not deploy unless they pass

---

## A quick look

```ts
import { gameFromRolls, frameScores, totalScore } from "./src/engine";

const game = gameFromRolls([10, 7, 3, 5]); // strike, spare, then a 5 in frame 3
frameScores(game).slice(0, 3);
// [{ value: 20, resolved: true },    strike: 10 + 7 + 3
//  { value: 15, resolved: true },    spare: 10 + 5
//  { value: null, resolved: false }] frame 3 is still being rolled
totalScore(game); // 35 — only resolved frames count
```

A `Frame` holds rolls and nothing else. Whether it is a strike, what it is worth and whose
turn it is are all derived from the rolls on demand, never stored — which is what keeps
the score from drifting. [How it works](docs/how-it-works.md) tells the longer story.

## Documentation

| Read this | For |
| --- | --- |
| [How it works](docs/how-it-works.md) | The two parts (engine and GUI), and why scoring is harder than it looks |
| [Scoring rules](docs/scoring.md) | Every rule the engine implements, and what it deliberately does not do |
| [Engine API](docs/engine-api.md) | Using the engine directly, more than one bowler, saving a game |
| [Development](docs/development.md) | Running it locally, the test suites, screenshots |

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test
```

[Development](docs/development.md) has the rest: `npm run verify`, screenshots, and how the
in-browser checks relate to the Jest suite.

## Provenance

Extracted from a talk about bowling scoring as an algorithm, where the
engine drives two decks live — a coaching deck and a local-access broadcast
deck, both reading the same event stream.

## Licence

[MIT](LICENSE).
