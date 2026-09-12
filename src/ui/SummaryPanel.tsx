import { Button, makeStyles } from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";
import { Coach } from "./Coach";
import { Scoreboard } from "./Scoreboard";
import { art } from "./theme";
import { useCompactLayout } from "./useCompactLayout";
import type { GameSummaryView } from "./useGameSummary";
import type { StatKey } from "./summary";

/**
 * GAME SUMMARY — the screen a game ends on.
 *
 * Three parts, in John's own order: the bowlers and their score cards, then
 * COACH'S CORNER (the stats, with the little coach standing beside his own
 * table), then QUICK LINKS out of here.
 *
 * The corner is the argument. The stats are not a results table the app is
 * showing you; they are the coach reading your game back, which is why he
 * stands next to them and why each row says what the number MEANT rather than
 * only what it was.
 *
 * NOT NAMED `Summary.tsx`: this repo builds on a case-insensitive filesystem
 * where that collides with `summary.ts` (TS1149) — the same trap that named
 * `roster.ts` and `settings.ts`.
 *
 * NO ARITHMETIC IN HERE. Every number arrives from `useGameSummary` already
 * worked out and already formatted; this file decides where things sit and
 * what they are called. A stat computed in a render is a stat that quietly
 * disagrees with the same stat computed somewhere else.
 */

/**
 * What a lead in each stat actually means — the coach's read.
 *
 * Copy lives HERE and not in `summary.ts`, which reports that a bowler leads a
 * number and stops. Whether leading it counts as "finds the pocket more often"
 * is a matter of what a coach would say, and that belongs to the surface.
 */
const EDGE_COPY: Record<StatKey, string> = {
  firstBallAvg: "finds the pocket more often",
  cleanFramePct: "avoids costly open frames",
  markEfficiencyPct: "cashes in the marks",
  openFrameCost: "minimises the damage when missing",
  tenthClutchPct: "finishes strong under pressure",
};

const useStyles = makeStyles({
  // THE OPACITY LAYER. Dark enough to read a table over, translucent enough
  // that the lane's own wood, arrows and perspective still come through — the
  // room is the thing the score happened in.
  scrim: {
    position: "absolute",
    inset: 0,
    zIndex: 5,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "18px 22px 16px",
    boxSizing: "border-box",
    overflowY: "auto",
    // Heavier at the foot than the head: the house lights go down over the
    // approach while the pin deck stays lit, which is how the reference reads.
    background:
      "linear-gradient(180deg, rgba(10,8,20,0.78) 0%, rgba(10,8,20,0.9) 45%, rgba(8,6,16,0.95) 100%)",
    animationName: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    animationDuration: "420ms",
    animationTimingFunction: "ease-out",
    animationFillMode: "both",
    "@media (max-width: 640px)": { padding: "12px 12px 12px", gap: "8px" },
  },
  title: {
    fontFamily: art.mono,
    // Matched to the page's own BOWLING ENGINE title — same face, same size,
    // same tracking — but WHITE, because the accent is the app's name and this
    // is the screen's name. Two cyan titles on one page compete; one cyan and
    // one white read as a heading inside an app.
    fontSize: "1.05rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    // The tracking eats a character's width off the right; the left padding
    // puts it back so the word sits centred rather than looking nudged.
    paddingLeft: "0.14em",
    color: art.text,
    textAlign: "center",
    flexShrink: 0,
    paddingTop: "6px",
    paddingBottom: "14px",
    "@media (max-width: 640px)": {
      fontSize: "0.86rem",
      letterSpacing: "0.12em",
      paddingTop: "2px",
      paddingBottom: "8px",
    },
  },
  // Section headings sit a clear step below the panel's own title — they name
  // a part of this screen, they do not compete with it for the top line.
  section: {
    fontFamily: art.mono,
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: art.muted,
    flexShrink: 0,
    marginTop: "2px",
    "@media (max-width: 640px)": { fontSize: "0.54rem", letterSpacing: "0.12em" },
  },
  // One column per bowler — a solo game gets the full width rather than half a
  // screen of empty space where an opponent would have been.
  bowlers: {
    display: "flex",
    gap: "14px",
    flexShrink: 0,
    justifyContent: "center",
    "@media (max-width: 640px)": { flexDirection: "column", gap: "8px" },
  },
  // CAPPED, and the cap is what makes a solo game read. Uncapped, one bowler
  // stretches to the full panel: the score ends up a screen's width from the
  // name it belongs to, and the score card shrinks to fit its own height in
  // the middle of all that room. Two bowlers share the width and never hit
  // the cap, so the same rule serves both.
  bowler: { flexGrow: 1, flexBasis: 0, minWidth: 0, maxWidth: "560px" },
  // THE LABEL BELONGS TO THE CARD, so it is centred over it as one group
  // rather than spread across the column. Spread, the name sat at the far left
  // and the score at the far right of the same bowler — a screen apart, and
  // reading as two separate things.
  headRow: { display: "flex", justifyContent: "center", marginBottom: "2px" },
  head: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: "12px",
    borderLeftWidth: "5px",
    borderLeftStyle: "solid",
    paddingLeft: "10px",
  },
  name: {
    fontFamily: art.mono,
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    color: art.text,
  },
  score: { fontFamily: art.hand, fontSize: "2rem", fontWeight: 700, lineHeight: 1 },
  card: { height: "104px", "@media (max-width: 640px)": { height: "78px" } },
  // The coach stands beside his own table — and on a phone he has the corner
  // to himself (see the table's own note).
  read: {
    display: "flex",
    gap: "14px",
    alignItems: "stretch",
    minHeight: 0,
    "@media (max-width: 640px)": { gap: 0, justifyContent: "center" },
  },
  coach: {
    width: "104px",
    flexShrink: 0,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    "@media (max-width: 640px)": { width: "108px" },
  },
  table: {
    flexGrow: 1,
    minWidth: 0,
    borderCollapse: "collapse",
    fontFamily: art.mono,
    fontSize: "0.72rem",
    color: art.text,
    "@media (max-width: 640px)": { fontSize: "0.6rem" },
  },
  th: {
    textAlign: "left",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: art.muted,
    paddingBottom: "6px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: art.border,
  },
  thNum: { textAlign: "right", paddingRight: "18px" },
  thMetric: { paddingLeft: "6px" },
  cell: {
    paddingTop: "7px",
    paddingBottom: "7px",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "rgba(40,35,68,0.6)",
    verticalAlign: "top",
  },
  metric: { color: art.muted, paddingLeft: "6px", paddingRight: "16px" },
  value: { textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", paddingRight: "18px" },
  detail: {
    display: "block",
    fontSize: "0.86em",
    fontWeight: 400,
    color: art.text,
    opacity: 0.72,
    letterSpacing: 0,
  },
  edge: { color: art.muted, minWidth: 0 },
  edgeName: { fontWeight: 700 },
  /**
   * THE WAY OUT that does not decide anything for you.
   *
   * Both quick links commit to something — one starts a new game, the other
   * opens the drawer — and neither is the right answer to "I have read this,
   * let me look at the room again". The dismiss is, and it is the only control
   * here that changes nothing about the game.
   *
   * 42px of click target regardless of how big the glyph is: this is the
   * smallest thing on the panel and it sits in a corner, which is exactly the
   * combination that misses on a phone.
   */
  dismiss: {
    position: "absolute",
    top: "8px",
    right: "10px",
    zIndex: 1,
    minWidth: "42px",
    minHeight: "42px",
  },
  // Left-aligned, under their own heading — a centred pair of buttons under a
  // left-aligned label reads as two unrelated things.
  actions: {
    display: "flex",
    gap: "10px",
    flexShrink: 0,
    paddingTop: "2px",
  },
});

export function SummaryPanel({
  view,
  onPlayAgain,
  onChangePlayers,
  onDismiss,
}: {
  view: GameSummaryView;
  onPlayAgain: () => void;
  onChangePlayers: () => void;
  onDismiss: () => void;
}) {
  const s = useStyles();
  const compact = useCompactLayout();
  // Two bowlers have an edge to name; one has nobody to be ahead of, so the
  // column is not rendered rather than rendered empty.
  const showEdge = view.rows.length > 1;
  return (
    <div className={s.scrim} role="region" aria-label="Game summary">
      <Button
        className={s.dismiss}
        appearance="subtle"
        icon={<DismissRegular />}
        aria-label="Dismiss the game summary"
        title="Dismiss"
        onClick={onDismiss}
      />
      <div className={s.title}>GAME SUMMARY</div>

      <div className={s.bowlers}>
        {view.rows.map((row) => (
          <div key={row.index} className={s.bowler}>
            <div className={s.headRow}>
              <span className={s.head} style={{ borderLeftColor: row.chrome }}>
                <span className={s.name}>{row.name}</span>
                <span className={s.score} style={{ color: row.chrome }}>
                  {row.total}
                </span>
              </span>
            </div>
            <div className={s.card}>
              <Scoreboard game={row.game} playerName={row.name} compact={compact} />
            </div>
          </div>
        ))}
      </div>

      <div className={s.section}>COACH&apos;S CORNER</div>
      <div className={s.read}>
        <div className={s.coach}>
          <Coach mood={view.winner === null ? "idle" : "celebration"} />
        </div>
        {/* NO STATS TABLE ON A PHONE (John, 2026-08-26). Three numeric columns
            plus a metric name plus a sentence of verdict is four columns of
            content in about 360 usable pixels, and every way of fitting it —
            shrinking the type, wrapping the verdict, scrolling sideways —
            trades the thing the panel exists for against the thing it is
            being squeezed into.

            So the phone keeps what a phone is good at: the score cards, the
            coach, and the way out. COACH'S CORNER IS THEN JUST A PLACE FOR HIM
            TO HANG OUT — he is observing the scores, which is a perfectly good
            job and the same one the crowd behind him has. */}
        {!compact && (
          <table className={s.table}>
            {/* COLUMN ORDER: the bowlers first, then what was being measured,
              then the verdict (John, 2026-08-26). The two people are the
              subject of this table; the metric name is the caption on the
              numbers rather than the thing you scan down. It also stops the
              metric column — the widest text here — pushing both bowlers over
              against the right edge, which is what it did when it led. */}
            <colgroup>
              {view.rows.map((row) => (
                <col key={row.index} style={{ width: "15%" }} />
              ))}
              <col style={{ width: showEdge ? "26%" : "auto" }} />
              {showEdge && <col />}
            </colgroup>
            <thead>
              <tr>
                {view.rows.map((row) => (
                  <th key={row.index} className={`${s.th} ${s.thNum}`} style={{ color: row.chrome }}>
                    {row.name}
                  </th>
                ))}
                <th className={`${s.th} ${s.thMetric}`}>METRIC</th>
                {showEdge && <th className={s.th}>EDGE</th>}
              </tr>
            </thead>
            <tbody>
              {view.stats.map((stat) => (
                <tr key={stat.key}>
                  {/* WHITE, both columns. Lighting the leader's number in their
                    own colour dimmed the very figure you are meant to read —
                    the bowler chromes are a violet and a cyan chosen to mark
                    ownership on dark chrome, not to carry body text. The EDGE
                    column names the leader, in colour, once. */}
                  {view.rows.map((row) => (
                    <td key={row.index} className={`${s.cell} ${s.value}`}>
                      {stat.display[row.index]}
                      {stat.detail[row.index] && <span className={s.detail}>{stat.detail[row.index]}</span>}
                    </td>
                  ))}
                  <td className={`${s.cell} ${s.metric}`}>{stat.label}</td>
                  {showEdge && (
                    <td className={`${s.cell} ${s.edge}`}>
                      {stat.leader === null ? (
                        "—"
                      ) : (
                        <>
                          <span className={s.edgeName} style={{ color: view.rows[stat.leader].chrome }}>
                            {view.rows[stat.leader].name}
                          </span>{" "}
                          {EDGE_COPY[stat.key]}
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={s.section}>QUICK LINKS</div>
      <div className={s.actions}>
        <Button appearance="primary" onClick={onPlayAgain}>
          Play again
        </Button>
        <Button appearance="secondary" onClick={onChangePlayers}>
          Change players
        </Button>
      </div>
    </div>
  );
}
