import { makeStyles } from "@fluentui/react-components";
import { BowlingBall } from "./Bowlers";
import { art } from "./theme";

/**
 * The curtain — a house ball, held up over the lane, saying what the game is
 * doing.
 *
 * WHY A BALL AND NOT A DIALOG. The page had no start and no end: with auto
 * roll on (the default) the lane simply begins bowling seven hundred
 * milliseconds after you arrive, and the biggest event in the session — the
 * game finishing — was four mono words appended to the score in the top bar.
 * Neither reads as an event, and a player who cannot tell when a game began
 * has no reason to believe they are driving it.
 *
 * A Fluent `Dialog` would say it, and would say it in the voice of an app
 * asking you to confirm a deletion. This room already has one object that
 * speaks — the coach is a bowling ball — so the thing that holds the lane is
 * the same ball, and the count is written on it in the wax pencil the
 * scoresheet already uses. It is furniture, not chrome.
 *
 * THE CURTAIN NEVER DECIDES ANYTHING. It renders a message and reports a tap;
 * whether the lane is held, and by what, belongs to the page. That boundary is
 * what lets the same object carry the countdown now and a pause or a game-over
 * later without any of them knowing about each other.
 */

const CURTAIN_KEYFRAMES = `
  @keyframes be-curtain-in  { from { opacity: 0; transform: scale(0.82); } to { opacity: 1; transform: scale(1); } }
  @keyframes be-curtain-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.18); } }
  @keyframes be-count-pop   { from { opacity: 0; transform: scale(1.45); } 45% { opacity: 1; } to { opacity: 1; transform: scale(1); } }
  @media (prefers-reduced-motion: reduce) {
    .be-curtain, .be-count { animation: none !important; }
  }
`;

const useStyles = makeStyles({
  // A CURTAIN, NOT A MODAL: no scrim, no focus trap, no dismiss cross. The
  // lane stays visible behind it because what is behind it is the thing you
  // are waiting for.
  wrap: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    display: "grid",
    placeItems: "center",
  },
  hit: {
    // The ball IS the button. Sized as a share of the pane so it stays the
    // same object on a phone as on a desktop, floored so it never shrinks to
    // an ornament and capped so it never swallows the lane.
    width: "clamp(140px, 34%, 300px)",
    aspectRatio: "1",
    padding: 0,
    border: "none",
    background: "none",
    cursor: "pointer",
    display: "block",
    borderRadius: "50%",
    ":focus-visible": { outline: `3px solid ${art.accent}`, outlineOffset: "6px" },
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
  },
});

export function BallCurtain({
  tint,
  caption,
  line,
  fading = false,
  announce,
  actionLabel,
  onAction,
}: {
  /** Whose ball it is — the bowler's own colour, so the curtain says whose game this is. */
  tint: string;
  /** The small line across the ball: STARTING, PAUSED, GAME OVER. */
  caption: string;
  /** The big one under it — a count, or a prompt. */
  line: string;
  /** Lifting: the last beat, played as the lane is handed back. */
  fading?: boolean;
  /** What a screen reader hears. The art is decorative; this is the message. */
  announce: string;
  /** Accessible name for the tap target. */
  actionLabel: string;
  onAction: () => void;
}) {
  const s = useStyles();
  return (
    <div className={s.wrap} role="status" aria-live="polite">
      <span className={s.srOnly}>{announce}</span>
      <button type="button" className={s.hit} aria-label={actionLabel} onClick={onAction}>
        <svg viewBox="-60 -60 120 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}>
          <style>{CURTAIN_KEYFRAMES}</style>
          <g
            className="be-curtain"
            style={{
              animation: fading ? "be-curtain-out 380ms ease-in both" : "be-curtain-in 260ms ease-out both",
              transformOrigin: "0px 0px",
              filter: `drop-shadow(0 10px 26px rgba(0,0,0,0.55))`,
            }}
          >
            <BowlingBall x={0} y={0} r={52} tint={tint} />
            {/* Ink on the ball, in the same wax pencil the scoresheet is
                written in — the room only owns one handwriting.

                THE TEXT SITS UNDER THE HOLES. The ball's three holes are drawn
                across its top third, and a caption centred on the middle
                collides with the rightmost one — so the block is dropped until
                its cap line clears them. Everything below is measured off that,
                not chosen: the holes bottom out around y = −2. */}
            <text x="0" y="12" textAnchor="middle" fontFamily={art.hand} fontSize="17" fontWeight="700" letterSpacing="1" fill="#0d1215">
              {caption}
            </text>
            {/* Keyed on the line, so each new count remounts and pops. */}
            <g key={line} className="be-count" style={{ animation: "be-count-pop 620ms ease-out both", transformOrigin: "0px 34px" }}>
              <text x="0" y="47" textAnchor="middle" fontFamily={art.hand} fontSize="38" fontWeight="700" fill="#0d1215">
                {line}
              </text>
            </g>
          </g>
        </svg>
      </button>
    </div>
  );
}
