# Development

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run verify     # lint + typecheck + test
npm run shots
```

`npm run shots` takes screenshots of both pages (the landing page and the
engine), at desktop and phone sizes, with Playwright. Start `npm run dev` in
another terminal first; the images are written to `shots/`, which is not
committed.

## The two test suites

The live page also ships its own in-browser check suite (`Run the tests`
on the landing page) — a smaller, framework-free harness that calls these
same exported functions and shows real pass/fail counts. `npm test` is
still the authoritative suite CI gates on; the in-browser one exists so a
visitor can watch the guarantee proved instead of taking a badge's word
for it.

The Jest suite lives beside the code it tests: [`src/engine.test.ts`](../src/engine.test.ts)
for the engine, and the tests under [`src/ui/`](../src/ui/) for the game summary. The
in-browser checks are [`src/ui/engineChecks.ts`](../src/ui/engineChecks.ts).

## Continuous integration

[`verify.yml`](../.github/workflows/verify.yml) runs lint, typecheck and the tests on
every pull request and every push to `main`. [`pages.yml`](../.github/workflows/pages.yml)
runs the same gates before it builds and deploys the live site, so the site does not
ship unless the engine behind it is green.
