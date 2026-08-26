import { Button, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowRightRegular } from "@fluentui/react-icons";
import { art } from "../ui/theme";
import { Coach } from "../ui/Coach";
import { Checks } from "../ui/Checks";
import { Scoreboard } from "../ui/Scoreboard";
import { useBowlingSim } from "../engine";

/**
 * The story page.
 *
 * Without the story it is nothing — a scoring engine on its own is a number
 * going up. What makes it worth anything is the fact underneath: bowling
 * scoring is a ledger that keeps rewriting the past, most implementations of
 * it are wrong at the edges, and this one is checkable right on this page.
 *
 * The page is deliberately short. Someone arriving from a talk has already
 * been sold; they need the argument compressed and then the door.
 */

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    background: art.bg,
    color: art.text,
    fontFamily: tokens.fontFamilyBase,
  },
  wrap: {
    maxWidth: "1040px",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "24px",
    paddingRight: "24px",
    paddingTop: "72px",
    paddingBottom: "96px",
    "@media (max-width: 640px)": {
      paddingTop: "40px",
      paddingBottom: "56px",
    },
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "40px",
    alignItems: "center",
    "@media (max-width: 820px)": {
      gridTemplateColumns: "1fr",
      gap: "24px",
    },
  },
  h1: {
    fontFamily: art.mono,
    fontSize: "clamp(2.4rem, 6vw, 4.2rem)",
    fontWeight: 700,
    letterSpacing: "0.02em",
    lineHeight: 1.02,
    margin: 0,
    color: art.text,
  },
  h1accent: { color: art.accent },
  standfirst: {
    fontSize: "clamp(1.05rem, 2vw, 1.35rem)",
    lineHeight: 1.6,
    color: art.muted,
    maxWidth: "44ch",
    marginTop: "20px",
    marginBottom: "32px",
  },
  h2: {
    fontFamily: art.mono,
    fontSize: "0.82rem",
    fontWeight: 700,
    letterSpacing: "0.26em",
    textTransform: "uppercase",
    color: art.accent,
    marginTop: "6px",
    marginBottom: "14px",
    lineHeight: 1.5,
  },
  section: {
    marginTop: "72px",
    display: "grid",
    // The heading sits in its own narrow rail beside the prose rather than
    // stacked on top of it — same page grammar as the sibling repo.
    gridTemplateColumns: "220px 1fr",
    gap: "40px",
    alignItems: "start",
    "@media (max-width: 820px)": {
      gridTemplateColumns: "1fr",
      gap: "12px",
      marginTop: "48px",
    },
  },
  sectionWide: {
    marginTop: "72px",
    "@media (max-width: 640px)": { marginTop: "48px" },
  },
  prose: {
    fontSize: "1.05rem",
    lineHeight: 1.75,
    color: art.text,
    maxWidth: "62ch",
    "& p": { marginTop: 0, marginBottom: "1.1em" },
    "& strong": { color: art.text, fontWeight: 600 },
    "& code": {
      fontFamily: art.mono,
      fontSize: "0.95em",
      color: art.accent,
      background: `${art.accent}14`,
      paddingLeft: "6px",
      paddingRight: "6px",
      paddingTop: "2px",
      paddingBottom: "2px",
      borderRadius: "4px",
    },
  },
  proseSingle: {
    fontSize: "1.05rem",
    lineHeight: 1.75,
    color: art.text,
    maxWidth: "70ch",
    "& p": { marginTop: 0, marginBottom: "1.1em" },
    "& strong": { color: art.text, fontWeight: 600 },
    "& code": {
      fontFamily: art.mono,
      fontSize: "0.95em",
      color: art.accent,
      background: `${art.accent}14`,
      paddingLeft: "6px",
      paddingRight: "6px",
      paddingTop: "2px",
      paddingBottom: "2px",
      borderRadius: "4px",
    },
  },
  examples: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginTop: "28px",
  },
  card: {
    border: `1px solid ${art.border}`,
    borderRadius: "10px",
    background: art.panel,
    padding: "18px 18px 14px",
  },
  cardPattern: {
    fontFamily: art.mono,
    fontSize: "2rem",
    fontWeight: 700,
    color: art.accent,
    lineHeight: 1,
  },
  cardName: {
    fontFamily: art.mono,
    fontSize: "0.9rem",
    color: art.text,
    marginTop: "8px",
  },
  cardNote: {
    fontSize: "0.85rem",
    color: art.muted,
    marginTop: "4px",
    lineHeight: 1.5,
  },
  demoBoard: {
    border: `1px solid ${art.border}`,
    borderRadius: "10px",
    background: art.panel,
    padding: "10px 6px",
    aspectRatio: "1000 / 200",
  },
  codeBlock: {
    fontFamily: art.mono,
    fontSize: "0.88rem",
    lineHeight: 1.7,
    color: art.text,
    border: `1px solid ${art.border}`,
    borderRadius: "10px",
    background: art.panel,
    padding: "16px 18px",
    overflowX: "auto",
    whiteSpace: "pre",
    margin: 0,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.95rem",
    "& th": {
      textAlign: "left",
      fontFamily: art.mono,
      fontSize: "0.72rem",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: art.muted,
      padding: "8px 12px",
      borderBottom: `1px solid ${art.border}`,
    },
    "& td": {
      padding: "10px 12px",
      borderBottom: `1px solid ${art.border}`,
      verticalAlign: "top",
      lineHeight: 1.5,
    },
  },
  cta: { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" },
  ctaNote: { fontSize: "0.85rem", color: art.muted },
  foot: {
    marginTop: "80px",
    paddingTop: "24px",
    borderTop: `1px solid ${art.border}`,
    fontSize: "0.85rem",
    color: art.muted,
    display: "flex",
    gap: "18px",
    flexWrap: "wrap",
  },
  link: { color: art.accent, textDecoration: "none" },
});

const EXAMPLES = [
  { p: "X X X", name: "The turkey", note: "Three strikes in a row. The first one is worth 30 — it borrowed from both of the others." },
  { p: "9 /", name: "The spare", note: "Worth 10 plus the NEXT roll — a mark you cannot total until the next frame starts." },
  { p: "7–10", name: "The split", note: "Same count as any two-pin leave. Completely different fact. That is why pins have identities here." },
];

const USAGE = `import { applyRoll, scoreFrame, runningTotal, simulateAutobowl } from "./src/engine";

let game = simulateAutobowl(42);   // a plausible, deterministic game
scoreFrame(game, 0);               // { value: 19, resolved: true }
scoreFrame(game, 4);               // { value: null, resolved: false } — strike, bonus pending

game = applyRoll(game, 7);         // quick entry: a count
game = applyRoll(game, [7, 10]);   // pin-tracked entry: the actual leave
runningTotal(game, 9);             // every RESOLVED frame, never a guess`;

const NOT_SUPPORTED: Array<[string, string, boolean]> = [
  ["Frame-by-frame scoring, all rules", "Supported", true],
  ["Lookback (strike/spare bonus resolution)", "Supported", true],
  ["10th frame fill-ball exception", "Supported", true],
  ["Which pins are standing — leaves and splits (the 7–10)", "Supported — an optional pin-identity layer; scoring itself only ever reads counts", true],
  ["More than one bowler", "Supported — N independent games, turn order derived rather than counted", true],
  ["Saving, restoring, undo, replay", "Supported — a game is plain JSON; no persistence layer required", true],
  ["Ball physics, hook, lane oil, pin carry", "Not supported — not the point", false],
  ["League standings, handicaps, season history", "Not supported — this scores games; it doesn't run a league", false],
];

export function Landing() {
  const s = useStyles();
  // The demo game, autobowled live on this page — same seed every visit, so
  // the frames you watch resolve are the frames the tests assert.
  const demo = useBowlingSim("autobowl", { seed: 42, rollIntervalMs: 1300 });

  return (
    <div className={s.page}>
      <div className={s.wrap}>
        {/* ── hero ─────────────────────────────────────────────────────── */}
        <div className={s.hero}>
          <div>
            <h1 className={s.h1}>
              Bowling
              <br />
              <span className={s.h1accent}>Engine</span>
            </h1>
            <p className={s.standfirst}>
              Ten-pin scoring is a ledger that keeps rewriting the past. This plays it out
              correctly, frame by frame, including the one rule everybody forgets.
            </p>
            <div className={s.cta}>
              <Button appearance="primary" size="large" icon={<ArrowRightRegular />} iconPosition="after" href="#/engine" as="a">
                Get the bowling engine
              </Button>
              <span className={s.ctaNote}>No install. Pick a bowler and watch it score.</span>
            </div>
          </div>
          <Coach width={210} />
        </div>

        {/* ── what is this ─────────────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.h2}>What is this?</h2>
          <div className={s.prose}>
            <p>
              A ten-pin scoring engine. Feed it rolls — live, taps, or autobowl — and it scores a
              real game: strikes and spares held open until the frames that resolve them actually
              land, the 10th frame&apos;s fill-ball exception handled as a real rule instead of a
              special case bolted on.
            </p>
            <p>
              It is two parts. <strong>The engine</strong> (<code>src/engine.ts</code>) is the
              algorithm: pure functions, zero dependencies, zero UI. <strong>The GUI</strong> is a
              small interactive scene built entirely on top of it — every pixel on the engine page
              is driven by a real function call, nothing scripted.
            </p>
          </div>
        </section>

        {/* ── why scoring is hard ──────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.h2}>Why it exists</h2>
          <div className={s.prose}>
            <p>
              Bowling scoring looks simple until you have to code it. A strike&apos;s value depends
              on <strong>rolls that have not happened yet</strong>. A spare in the 9th can reach
              into the 10th for its bonus. The 10th frame breaks its own rules on purpose, because
              there is no 11th frame left to lend it a lookback.
            </p>
            <p>
              Most scoring bugs come from conflating two different variables:{" "}
              <strong>how many pins are standing</strong> (resets on every strike) versus{" "}
              <strong>how many rolls have happened</strong> in the frame. This engine keeps them
              separate from the start — and keeps a third fact separate too: <em>which</em> pins
              are standing, because a count alone can never tell a 7–10 from an easy two-pin leave.
            </p>
          </div>
        </section>

        <div className={s.examples}>
          {EXAMPLES.map((e) => (
            <div key={e.p} className={s.card}>
              <div className={s.cardPattern}>{e.p}</div>
              <div className={s.cardName}>{e.name}</div>
              <div className={s.cardNote}>{e.note}</div>
            </div>
          ))}
        </div>

        {/* ── see it ───────────────────────────────────────────────────── */}
        <section className={s.sectionWide}>
          <h2 className={s.h2}>A game, scoring itself</h2>
          <div className={s.demoBoard}>{demo && <Scoreboard game={demo.game} />}</div>
          <div className={s.proseSingle} style={{ marginTop: "20px" }}>
            <p>
              That is <code>simulateAutobowl(42)</code>, replayed one roll at a time and scored
              live by <code>scoreFrame()</code>. A wobbling <code>?</code> is not a placeholder —
              it is an unresolved frame, a strike or spare whose bonus rolls genuinely have not
              landed yet. When they land, the wax sets and the past gets rewritten.
            </p>
            <div className={s.cta}>
              <Button appearance="primary" size="large" icon={<ArrowRightRegular />} iconPosition="after" href="#/engine" as="a">
                Get the bowling engine
              </Button>
            </div>
          </div>
        </section>

        {/* ── the guarantee, checkable ─────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.h2}>Does it actually work?</h2>
          <div>
            <div className={s.proseSingle} style={{ marginBottom: "20px" }}>
              <p>
                Don&apos;t take the copy&apos;s word for it. These checks call the same exported
                functions everything on these pages calls — the perfect 300, the chained-strike
                lookback, the fill ball, the 7–10 — and count real pass/fail results, computed in
                your browser when you press Run.
              </p>
            </div>
            <Checks />
          </div>
        </section>

        {/* ── plug and play ────────────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.h2}>Using the engine directly</h2>
          <div>
            <pre className={s.codeBlock}>{USAGE}</pre>
            <div className={s.proseSingle} style={{ marginTop: "16px" }}>
              <p>
                Framework-free core; the one React adapter (<code>useBowlingSim</code>) sits at the
                bottom of the file and is trivially replaceable with a loop over{" "}
                <code>applyRoll</code>.
              </p>
            </div>
          </div>
        </section>

        {/* ── what it does not do ──────────────────────────────────────── */}
        <section className={s.section}>
          <h2 className={s.h2}>What it does not do</h2>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Concern</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {NOT_SUPPORTED.map(([concern, status, ok]) => (
                <tr key={concern}>
                  <td>{concern}</td>
                  <td style={{ color: ok ? art.text : art.muted, fontWeight: ok ? 400 : 600 }}>{status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className={s.foot}>
          <span>MIT licensed.</span>
          <a className={s.link} href="https://github.com/johnfrog76/bowling-engine">
            Source on GitHub
          </a>
          <span>Scoring only. No ball physics, no league history.</span>
        </footer>
      </div>
    </div>
  );
}
