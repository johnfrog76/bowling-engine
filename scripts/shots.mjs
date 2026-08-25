/**
 * Screenshot both pages, desktop and phone.
 *
 *   npm run dev          (in one terminal)
 *   npm run shots        (in another)
 *
 * Writes to shots/ , which is gitignored — these are for looking at during
 * development, not artefacts to commit. Playwright is a devDependency here
 * rather than borrowed from a sibling repo, so this works on a fresh clone.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE ?? "http://localhost:5173";
const OUT = "shots";

const PAGES = [
  { name: "landing", path: "/", full: true },
  { name: "engine", path: "/#/engine", full: false },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  for (const p of PAGES) {
    await page.goto(BASE + p.path, { waitUntil: "networkidle" });
    // let a beat or two of the roll animation run so the lane isn't caught at t=0
    await page.waitForTimeout(2000);
    const file = `${OUT}/${p.name}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: p.full });
    console.log(file);
  }
  await page.close();
}

await browser.close();
