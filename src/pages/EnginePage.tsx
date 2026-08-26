import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  InlineDrawer,
  OverlayDrawer,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ArrowLeftRegular, DismissRegular, ReplayRegular, SettingsRegular } from "@fluentui/react-icons";
import type { Match, Mood, PinId } from "../engine";
import {
  FULL_RACK,
  applyMatchRoll,
  bowlerUp,
  classifyMood,
  currentFrameIndex,
  emptyMatch,
  isMatchOver,
  standingAfter,
  totalScore,
} from "../engine";
import { art } from "../ui/theme";
import { LaneView, type LaneRoll, type LaneStyle } from "../ui/Lane";
import { LANE_CYCLE, LANE_CYCLE_S } from "../ui/laneCycle";
import { Overhead } from "../ui/Overhead";
import { Crowd } from "../ui/Crowd";
import { CoachPanel } from "../ui/Coach";
import { Scoreboard } from "../ui/Scoreboard";
import { BowlerFigure, Trophy } from "../ui/Bowlers";
import { bowlerBall, bowlerChrome, bowlerLabel } from "../ui/roster";
import { rollForSkill, skillTrophy } from "../ui/skill";
import { Controls } from "../ui/Controls";
import { BallCurtain } from "../ui/BallCurtain";
import { SummaryPanel } from "../ui/SummaryPanel";
import { useGameSummary } from "../ui/useGameSummary";
import { DEFAULT_PLAYERS, DEFAULT_SETTINGS, type PlayerConfig, type Settings } from "../ui/settings";
import { useCompactLayout } from "../ui/useCompactLayout";

/**
 * The tool, as a room — and the room now takes the whole page.
 *
 * THE CONTROLS MOVED INTO A DRAWER, which is what paid for everything else.
 * The old control bar held five knobs across the top and was already
 * wrapping; the vertical it was spending is roughly what a second scoresheet
 * row costs. Same trade the sibling repo's explorer makes: the tool is the
 * page, so the tool gets the room, and the knobs are one gear away.
 *
 * Every pane still renders what the engine reports and nothing else. The lane
 * animates `standingAfter()`; the coach reacts to `classifyMood` transitions;
 * the scoresheet is `scoreFrame()` mark by mark. With more than one bowler
 * that is unchanged — a match is N of the same games, and `bowlerUp()` says
 * whose turn it is. Which lane somebody stands on is decided HERE, because
 * lane assignment is presentation and the engine has no opinion about it.
 */

const CYCLE_MS = Math.round(LANE_CYCLE_S * 1000) + 500;

/**
 * THE COUNTDOWN — a game starts when somebody has been told it is starting.
 *
 * THE REASON, and it is not decoration: a player feels in control when they
 * know a game is starting. Auto roll is the default, so before this the lane
 * simply began bowling seven hundred milliseconds after you arrived — no
 * announced beginning, and therefore no sense that the game was yours to run
 * rather than something already running that you had walked in on. Three
 * seconds of ceremony buys the whole session a beginning, and the same
 * argument is why the end of a game deserves more than four words appended to
 * the score in the top bar.
 *
 * IT IS ALWAYS SKIPPABLE — one tap on the ball. Three seconds is an event the
 * first time and an obstacle the fourth, and the difference between ceremony
 * and a cutscene is whether you can get out of it.
 *
 * The count runs 3 → 2 → 1 → 0, and ZERO IS THE FADE: the lane is handed back
 * as the curtain begins to lift, so the first ball is already on its way while
 * the ball is still swelling out of shot.
 */
const COUNT_FROM = 3;
const COUNT_TICK_MS = 700;
const COUNT_FADE_MS = 380;

/**
 * THE BEAT BEFORE THE SUMMARY.
 *
 * The last ball's leave is the thing that decided the game, and a panel that
 * drops on top of it is a panel that covers the ending. So the room holds,
 * the rake takes the deadwood and sets a fresh rack, and only then does the
 * summary come up over it. The reset IS the game-over gesture; nothing has to
 * announce it.
 */
const SUMMARY_HOLD_MS = 1500;

const useStyles = makeStyles({
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: art.bg,
    color: art.text,
    fontFamily: tokens.fontFamilyBase,
  },
  // THREE SLOTS: left, centre, right. The outer two flex so the centre one is
  // centred on the PAGE rather than on whatever is left over — a score that
  // drifts sideways as the roster changes is a score you have to hunt for.
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: "10px",
    paddingBottom: "10px",
    borderBottom: `1px solid ${art.border}`,
  },
  barLeft: { display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 },
  barCentre: { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  barRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginTop: 0,
    marginBottom: 0,
    fontFamily: art.mono,
    fontSize: "1.05rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: art.accent,
    whiteSpace: "nowrap",
    "@media (max-width: 900px)": { display: "none" },
  },
  total: {
    fontFamily: art.mono,
    fontSize: "0.9rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: art.text,
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    gap: "16px",
    padding: "14px 20px 20px",
    width: "100%",
    boxSizing: "border-box",
    "@media (max-width: 640px)": { padding: "10px 10px 16px" },
  },
  stage: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  lanes: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    gap: "12px",
  },
  // THE HOUSE AS A SPRITE STRIP. Every lane laid out in a row inside the
  // pane's window; the strip is translated so the lane in play sits in the
  // window. Each lane is exactly one window wide (the strip is count × 100%
  // and the lanes share it equally), so one step is one lane.
  house: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    transitionProperty: "transform",
    transitionDuration: "900ms",
    // Eased at both ends: a camera on a dolly does not start or stop dead.
    transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
    willChange: "transform",
  },
  houseLane: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, height: "100%" },
  overheadChip: {
    position: "absolute",
    top: "8px",
    right: "8px",
    zIndex: 2,
    width: "104px",
    height: "116px",
    "@media (max-width: 640px)": { width: "76px", height: "86px", top: "6px", right: "6px" },
    borderRadius: "8px",
    border: `1px solid ${art.border}`,
    background: "rgba(8,7,16,0.62)",
    backdropFilter: "blur(2px)",
    pointerEvents: "none",
  },
  chipLabel: {
    position: "absolute",
    top: "4px",
    // Centred across the chip rather than tucked in a corner — it names the
    // camera the box IS, so it reads as a caption on the feed.
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: art.mono,
    fontSize: "0.52rem",
    fontWeight: 700,
    // The name is two words and the chip is narrow: at the old tracking it
    // measured a couple of pixels wider than the box and dropped to a second
    // line. One line, always — a caption that wraps stops reading as a caption.
    letterSpacing: "0.1em",
    whiteSpace: "nowrap",
    color: art.muted,
    "@media (max-width: 640px)": { fontSize: "0.46rem", letterSpacing: "0.06em" },
  },
  chipBody: { position: "absolute", inset: "16px 6px 5px" },
  // Side by side on desktop; STACKED on a phone, where sharing the width left
  // the card about 220px across — at which point no amount of font work makes
  // a ten-frame sheet readable. The card needs the full width more than the
  // coach needs to sit beside it.
  middle: {
    display: "flex",
    gap: "12px",
    height: "168px",
    flexShrink: 0,
    // The coach and the card have no job once the game is over, so they leave
    // — eased, because the room should settle rather than jump.
    transitionProperty: "height, opacity",
    transitionDuration: "420ms",
    transitionTimingFunction: "ease",
    overflow: "hidden",
    // COLUMN-REVERSE ON A PHONE (John): the card comes first, right under the
    // throw that just changed it, and the coach drops to sit against the
    // crowd it is talking to. Source order stays coach-then-card because that
    // is the reading order on a wide screen, where they sit side by side.
    "@media (max-width: 640px)": { flexDirection: "column-reverse", height: "auto" },
  },
  coachPane: {
    width: "240px",
    flexShrink: 0,
    "@media (max-width: 640px)": { width: "100%", height: "92px" },
  },
  cardPane: {
    flexGrow: 1,
    minWidth: 0,
    "@media (max-width: 640px)": { flexGrow: 0, height: "132px", width: "100%" },
  },
  // The card stack, turned on its side relative to the house: same window
  // trick, but travelling DOWN so the two motions never read as one.
  cardStack: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    transitionProperty: "transform",
    transitionDuration: "700ms",
    transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
    willChange: "transform",
  },
  cardSlot: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0, width: "100%" },
  // The bowler is boxed exactly like the overhead — same border, ground and
  // blur — so the lane's two corner readouts are one furniture family. It
  // sits under the lane's own meta label, top left.
  // THE BOWLER, AS A BROADCAST CUT-IN. Same border and ground as the overhead
  // so the lane's two readouts stay one family, but bigger, because this one
  // is a person and the other is a diagram.
  bowlerChip: {
    position: "absolute",
    top: "12px",
    left: "14px",
    zIndex: 2,
    width: "158px",
    height: "246px",
    borderRadius: "8px",
    border: `1px solid ${art.border}`,
    background: "rgba(8,7,16,0.62)",
    backdropFilter: "blur(2px)",
    pointerEvents: "none",
    // THE CAP. A broadcast cut-in is capped by the show's colour along its
    // top edge — the one place the frame admits it was put there by someone.
    borderTopWidth: "4px",
    borderTopStyle: "solid",
    "@media (max-width: 640px)": {
      width: "104px",
      height: "166px",
      top: "10px",
      left: "8px",
      borderTopWidth: "3px",
    },
  },
  // Air under the feet. The plate crosses the box's bottom edge, so the
  // figure has to stop well short of it — standing on the nameplate reads as
  // a crop, and the whole point of the cut-in is that they are standing in it.
  bowlerArt: {
    position: "absolute",
    inset: "10px 10px 44px",
    "@media (max-width: 640px)": { inset: "8px 8px 32px" },
  },
  chipTrophy: {
    position: "absolute",
    top: "6px",
    right: "6px",
    width: "28px",
    height: "32px",
    "@media (max-width: 640px)": { width: "20px", height: "24px" },
  },
  /**
   * THE NAMEPLATE, seated inside the box along its floor.
   *
   * It hung off the bottom-left corner for a while, the way a broadcast lower
   * third does. Inside is quieter: the cut-in stays one clean rectangle, and
   * the name reads as part of the fitting rather than a second object laid
   * over it. The colour it lost when the fill came off is carried by the bar
   * and the cap, which is enough.
   */
  namePlate: {
    position: "absolute",
    left: "10px",
    right: "10px",
    bottom: "10px",
    zIndex: 3,
    height: "26px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    paddingLeft: 0,
    // NO FILL. A solid slab of colour behind the name shouted over the shot;
    // the bar alone carries the brand and the name is simply lit. Same
    // information, a fraction of the volume.
    "@media (max-width: 640px)": { height: "18px", left: "7px", right: "7px", bottom: "7px" },
  },
  // The colour bar down the leading edge — now the ONLY place the plate is
  // coloured, matching the cap above it so the two read as one fitting.
  plateFlash: {
    width: "5px",
    height: "100%",
    borderRadius: "1px",
    flexShrink: 0,
    "@media (max-width: 640px)": { width: "4px" },
  },
  plateName: {
    fontFamily: art.mono,
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    // Inverted: light type in open air rather than dark type on a slab. It
    // hangs below the box over the lane, so it carries its own shadow instead
    // of a panel to sit on.
    color: art.text,
    textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    "@media (max-width: 640px)": { fontSize: "0.56rem", letterSpacing: "0.1em" },
  },
  laneRoll: {
    position: "absolute",
    top: "276px",
    left: "14px",
    zIndex: 3,
    width: "158px",
    minWidth: 0,
    "@media (max-width: 640px)": { top: "188px", left: "8px", width: "104px" },
  },
  pane: {
    position: "relative",
    border: `1px solid ${art.border}`,
    borderRadius: "10px",
    background: art.panel,
    overflow: "hidden",
    minHeight: 0,
  },
  paneLabel: {
    position: "absolute",
    top: "6px",
    left: "8px",
    zIndex: 2,
    fontFamily: art.mono,
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.16em",
    color: art.muted,
    background: "rgba(8,7,16,0.6)",
    padding: "2px 7px",
    borderRadius: "4px",
    borderLeft: `3px solid ${art.accent}`,
    pointerEvents: "none",
  },
  paneFill: { position: "absolute", inset: 0 },
  padded: { position: "absolute", inset: "18px 8px 6px" },
});

function Pane({
  label,
  accent,
  children,
  style,
  className,
}: {
  /** Omitted where the pane's contents already say what it is. */
  label?: string;
  /**
   * Recolours the chip's leading rule — nothing else.
   *
   * Every pane's caption sits at one volume: muted type on a dark ground.
   * A pane that needs to say WHOSE it is says so in that rule, in the
   * bowler's own colour, rather than by lighting the whole chip up and
   * outshouting the panes either side of it.
   */
  accent?: string;
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const s = useStyles();
  return (
    <div className={`${s.pane} ${className ?? ""}`} style={style}>
      {label && (
        <span className={s.paneLabel} style={accent ? { borderLeftColor: accent } : undefined}>
          {label}
        </span>
      )}
      <div className={s.paneFill}>{children}</div>
    </div>
  );
}

/** Pins standing for a game's frame in progress — what an idle lane shows. */
function idleStanding(match: Match, i: number): readonly PinId[] {
  const game = match.games[i];
  const fi = currentFrameIndex(game);
  if (fi === null) return FULL_RACK;
  const frame = game.frames[fi];
  if (!frame || frame.rolls.length === 0) return FULL_RACK;
  return standingAfter(frame, frame.rolls.length - 1);
}

/** Everything the lane animates for the roll that just landed in this game. */
function laneRollFor(match: Match, i: number): LaneRoll | undefined {
  const game = match.games[i];
  let fi = -1;
  for (let f = 0; f < game.frames.length; f++) if (game.frames[f].rolls.length > 0) fi = f;
  if (fi < 0) return undefined;
  const frame = game.frames[fi];
  const ri = frame.rolls.length - 1;
  const standingBefore = ri === 0 ? FULL_RACK : standingAfter(frame, ri - 1);
  const pinsLeft = standingAfter(frame, ri);
  const felled = frame.pinfall?.[ri] ?? [];
  const cleared = felled.length === standingBefore.length;
  const sameFrameContinues = currentFrameIndex(game) === fi;
  return {
    id: game.frames.reduce((n, f) => n + f.rolls.length, 0),
    standingBefore,
    felled,
    pinsLeft,
    reset: !cleared && sameFrameContinues ? "partial" : "full",
  };
}

export function EnginePage() {
  const s = useStyles();
  const compact = useCompactLayout();

  const [players, setPlayers] = useState<PlayerConfig[]>([...DEFAULT_PLAYERS]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // OPEN ON DESKTOP, SHUT ON A PHONE — same call the sibling repo makes: on a
  // phone there is not room for both, and the lane is the thing worth seeing.
  const [drawer, setDrawer] = useState(!compact);

  const [match, setMatch] = useState<Match>(() => emptyMatch(1));
  /**
   * Who threw the ball currently playing. NOT stored in the match: the caller
   * asks `bowlerUp` before it rolls, so it already knows. This is the lane
   * animation's own state — presentation, not a fact about the game.
   */
  const [lastBy, setLastBy] = useState<number | null>(null);

  const count = players.length;

  /**
   * The roster and the match change TOGETHER, in one handler.
   *
   * Not in an effect keyed on the roster length: that renders once with a
   * roster of N and a match of N−1, and every pane that indexes
   * `match.games[i]` is reading a game that does not exist yet. The roster
   * length owns the match's shape, so the two have to move in the same commit.
   *
   * Changing the roster starts a fresh match rather than grafting a game onto
   * one in progress — a half-bowled match with a new arrival has no honest
   * answer.
   */
  const changePlayers = (next: PlayerConfig[]) => {
    setPlayers(next);
    if (next.length !== count) {
      setMatch(emptyMatch(next.length));
      setLastBy(null);
      busyRef.current = false;
      setBusy(false);
      setCountdown(COUNT_FROM);
    }
  };

  const up = bowlerUp(match);
  const over = isMatchOver(match);

  /**
   * The curtain's count, or null once it is gone.
   *
   * `held` is what the rest of the page reads: the lane takes no ball while
   * the curtain is up. Kept as a plain derived boolean rather than a second
   * piece of state, so there is exactly one thing to reset.
   */
  const [countdown, setCountdown] = useState<number | null>(COUNT_FROM);
  const held = countdown !== null && countdown > 0;
  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(
      () => setCountdown((n) => (n === null || n <= 0 ? null : n - 1)),
      countdown > 0 ? COUNT_TICK_MS : COUNT_FADE_MS,
    );
    return () => clearTimeout(t);
  }, [countdown]);

  /**
   * The summary goes up a beat after the last ball lands, and comes straight
   * down whenever a new game starts. Kept as its own flag rather than reading
   * `over` directly, so the hold is a real pause rather than a render the
   * panel happens to skip.
   */
  const [summaryUp, setSummaryUp] = useState(false);
  useEffect(() => {
    if (!over) {
      setSummaryUp(false);
      return;
    }
    const t = setTimeout(() => setSummaryUp(true), SUMMARY_HOLD_MS);
    return () => clearTimeout(t);
  }, [over]);

  /**
   * THE LANE IS BUSY UNTIL THE BALL HAS FINISHED ARRIVING.
   *
   * A throw owns the lane for a whole machine cycle — the ball travels, the
   * pins go, the rake comes down, and the camera pans to whoever is next.
   * Letting a second Roll land inside that window restarts the cycle on top
   * of itself and cuts the pan off halfway, so the button locks until the
   * lane is clear again. The ENGINE would have taken the roll quite happily;
   * this is a rule about the room, not about scoring, which is why it lives
   * here and not in `applyMatchRoll`.
   *
   * Held in a ref as well as state: the ref is what `rollOnce` reads, so a
   * double-click or a held key cannot slip a second roll through between
   * renders.
   */
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const stateRef = useRef({ match, players, up, held });
  stateRef.current = { match, players, up, held };

  const rollOnce = () => {
    const { match: m, players: ps, up: who, held: shut } = stateRef.current;
    // The curtain holds the lane the same way the machine cycle does — read
    // here rather than only disabling the button, so an autobowled roll and a
    // held key are stopped by the same rule.
    if (who === null || busyRef.current || shut) return;
    busyRef.current = true;
    setBusy(true);
    const standing = idleStanding(m, who);
    setMatch(applyMatchRoll(m, rollForSkill(ps[who].skill, standing)));
    setLastBy(who);
  };
  const rollRef = useRef(rollOnce);
  rollRef.current = rollOnce;

  // Cleared a beat BEFORE the autobowl clock comes round again, so the lock
  // never eats an autobowled roll on a tie.
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => {
      busyRef.current = false;
      setBusy(false);
    }, CYCLE_MS - 400);
    return () => clearTimeout(t);
  }, [busy]);

  // Restarts when the curtain lifts, which is what puts the first ball on the
  // lane as the ball swells out of shot rather than under it.
  useEffect(() => {
    if (!settings.autoRoll || over || held) return;
    const first = setTimeout(() => rollRef.current(), 700);
    const id = setInterval(() => rollRef.current(), CYCLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [settings.autoRoll, over, held]);

  // Only the lane that was just thrown on plays a cycle; the others hold
  // whatever they were left standing.
  const activeRoll = useMemo(
    () => (lastBy === null ? undefined : laneRollFor(match, lastBy)),
    [match, lastBy],
  );

  // The overhead and the coach hold their breath until IMPACT: the engine
  // knows the leave the moment the roll is applied, but showing it while the
  // ball is still rolling down-lane spoils the throw.
  const rollId = activeRoll?.id;
  const latestRef = useRef({ activeRoll, lastBy, match });
  latestRef.current = { activeRoll, lastBy, match };
  const [shownStanding, setShownStanding] = useState<readonly PinId[]>(FULL_RACK);
  const [shownMood, setShownMood] = useState<Mood>("idle");
  useEffect(() => {
    const r = latestRef.current.activeRoll;
    if (!r) {
      setShownStanding(FULL_RACK);
      setShownMood("idle");
      return;
    }
    setShownStanding(r.standingBefore);
    const t = setTimeout(
      () => {
        const cur = latestRef.current;
        setShownStanding(cur.activeRoll?.pinsLeft ?? FULL_RACK);
        // The coach reacts to whoever just threw — one room, one commentator.
        if (cur.lastBy !== null && cur.activeRoll) {
          setShownMood(
            classifyMood(cur.match.games[cur.lastBy], { kind: "roll", pins: cur.activeRoll.felled.length }),
          );
        }
      },
      (LANE_CYCLE.roll + 0.15) * 1000,
    );
    return () => clearTimeout(t);
  }, [rollId, lastBy]);

  // Everything the summary renders, worked out and formatted one file over.
  const summary = useGameSummary(match, players);

  const laneStyle: LaneStyle = settings.starlight ? "starlight" : "classic";
  /**
   * WHERE THE CAMERA IS POINTED.
   *
   * The bowler who last threw holds the shot until the next one throws —
   * which is what makes the pan land AFTER the ball, the way a broadcast
   * follows through and then travels. Pointing it at `bowlerUp` instead would
   * swing the camera away the instant a strike landed, off the pins that
   * just fell.
   */
  const viewIdx = Math.min(lastBy ?? up ?? 0, count - 1);
  const viewMetal = skillTrophy(players[viewIdx].skill);
  // One colour per bowler, used everywhere the page says WHOSE something is.
  const viewChrome = bowlerChrome(players[viewIdx].kind);

  const newGame = () => {
    setMatch(emptyMatch(count));
    setLastBy(null);
    busyRef.current = false;
    setBusy(false);
    setCountdown(COUNT_FROM);
    setSummaryUp(false);
  };

  // ── the stage ─────────────────────────────────────────────────────────────
  const stage = (
    <div className={s.stage}>
      {/* ── ONE ALLEY, ONE CAMERA ────────────────────────────────────────
          The lanes are not separate panes any more. They sit in a strip that
          is the house, and the pane is a WINDOW onto it: when the lane passes,
          the window slides along to the bowler who is up, the way a camera
          pans down the house rather than cutting between two feeds.

          The strip is what moves; each lane's art is untouched and never
          re-renders for the pan, so this costs one transform. It also means
          the house can be longer than the roster later — idle lanes either
          side — without any of this changing. */}
      <div className={s.lanes}>
        {/* NO PANE LABEL — the cut-in's nameplate already says who is at the
            line and which lane it is, and a caption in the corner repeating it
            was the kind of chrome that makes a shot look like a diagram. */}
        <Pane style={{ flex: 1, minHeight: compact ? "260px" : 0 }}>
          <div
            className={s.house}
            style={{
              width: `${count * 100}%`,
              transform: `translateX(-${viewIdx * (100 / count)}%)`,
            }}
          >
            {players.map((p, i) => (
              <div key={i} className={s.houseLane}>
                <LaneView
                  laneStyle={laneStyle}
                  // Once the summary is up the machine has racked for a game
                  // nobody is going to bowl — the lane put back the way it was
                  // found. That reset IS the game-over gesture.
                  standing={summaryUp ? FULL_RACK : idleStanding(match, i)}
                  roll={!summaryUp && lastBy === i ? activeRoll : undefined}
                  ballTint={bowlerBall(p.kind, settings.starlight)}
                  laneNumber={7 + i}
                  fit="slice"
                />
              </div>
            ))}
          </div>
          {/* META INFO, LOCKED INTO THE LANE'S TOP-RIGHT CORNER — pinned to
              the window rather than the strip, so it stays put while the
              camera travels and reports whatever the camera is looking at. */}
          {/* Both readouts are about the NEXT ball, so both leave with it. */}
          {!summaryUp && (
            <div className={s.overheadChip}>
              <span className={s.chipLabel}>OVERHEAD CAM</span>
              <div className={s.chipBody}>
                <Overhead standing={lastBy === viewIdx ? shownStanding : idleStanding(match, viewIdx)} />
              </div>
            </div>
          )}
          {/* WHOEVER IS AT THE LINE, boxed like the overhead and standing
              under the lane's own label — they belong to the lane, not to a
              pane off to the side. The label sits along the BOTTOM here
              rather than the top, because the figure stands on it; the metal
              they have earned goes in the top corner, where it reads as a
              shelf rather than something they are carrying. */}
          {!summaryUp && (
            <div className={s.bowlerChip} style={{ borderTopColor: viewChrome }}>
              <div className={s.bowlerArt}>
                <BowlerFigure kind={players[viewIdx].kind} starlight={settings.starlight} />
              </div>
              {viewMetal && (
                <div className={s.chipTrophy}>
                  <Trophy metal={viewMetal} />
                </div>
              )}
              <span className={s.namePlate}>
                <span className={s.plateFlash} style={{ background: viewChrome }} />
                <span className={s.plateName}>
                  {bowlerLabel(players[viewIdx].kind).toUpperCase()} &middot; LANE {7 + viewIdx}
                </span>
              </span>
            </div>
          )}
          {/* THE ROLL BUTTON BELONGS TO THE LANE, NOT TO A BOWLER.
              It was bound to the bowler in shot — disabled unless the camera
              happened to be on whoever was up — and that deadlocked a manual
              two-hander: the moment a frame closed the lane passed, the camera
              stayed on whoever had just thrown, and the only Roll on screen
              belonged to somebody whose turn it no longer was. Nothing could
              advance it. (Autobowl escaped because it calls the driver
              straight, and the phone escaped because the bar carries its own.)

              A lane takes the next ball; WHOSE ball it is, is the engine's
              business — `rollOnce` already asks `bowlerUp`. So the button only
              cares whether the lane is free. */}
          {!settings.autoRoll && !summaryUp && (
            <Button
              appearance="primary"
              size="small"
              disabled={over || busy || held}
              onClick={() => rollRef.current()}
              className={s.laneRoll}
            >
              Roll
            </Button>
          )}
          {/* THE CURTAIN, pinned to the WINDOW rather than the strip — the
              same rule the overhead chip follows, so it stays put if the
              camera travels underneath it. It takes the colour of whoever is
              about to throw, which is how a two-hander learns whose game it is
              before the first ball. */}
          {summaryUp && (
            <SummaryPanel
              view={summary}
              onPlayAgain={newGame}
              onChangePlayers={() => setDrawer(true)}
              // Puts the panel away without touching the game. It stays away
              // because `over` has not changed — only a new game raises it
              // again, which is what New game and Play again both do.
              onDismiss={() => setSummaryUp(false)}
            />
          )}
          {countdown !== null && (
            <BallCurtain
              tint={bowlerChrome(players[Math.min(up ?? 0, count - 1)].kind)}
              caption="STARTING"
              line={String(Math.max(countdown, 1))}
              fading={countdown === 0}
              announce={`Starting in ${Math.max(countdown, 1)}`}
              actionLabel="Skip the countdown and start bowling"
              onAction={() => setCountdown(0)}
            />
          )}
        </Pane>
      </div>

      {/* ── the coach, and the card of whoever is bowling ─────────────────
          One card, not a stack. Two sheets side by side made you find your
          bowler before you could read a score; the card belongs to whoever is
          at the line, and the others are a scroll away rather than a search.

          Same sprite trick as the house, turned ninety degrees: the cards are
          stacked and the window slides DOWN to the one in play. Vertical on
          purpose — the house travels sideways, so if the cards did too the two
          motions would read as one thing sliding, and they are not related. */}
      <div className={s.middle} style={summaryUp ? { height: 0, opacity: 0 } : undefined}>
        <Pane label="COACH" className={s.coachPane}>
          <CoachPanel mood={shownMood} />
        </Pane>
        <Pane
          label={`SCORECARD · ${bowlerLabel(players[viewIdx].kind).toUpperCase()}`}
          accent={viewChrome}
          className={s.cardPane}
        >
          <div
            className={s.cardStack}
            style={{
              height: `${count * 100}%`,
              transform: `translateY(-${viewIdx * (100 / count)}%)`,
            }}
          >
            {players.map((p, i) => (
              <div key={i} className={s.cardSlot}>
                <Scoreboard
                  game={match.games[i]}
                  playerName={bowlerLabel(p.kind).toUpperCase()}
                  compact={compact}
                />
              </div>
            ))}
          </div>
        </Pane>
      </div>

      {/* ── the stands own the bottom ─────────────────────────────────── */}
      {/* THE STANDS OWN THE BOTTOM — and own MORE of it once the game is
          over. The room does not go dark and it does not cut away; it empties
          of the people who had a job and fills with the people who were only
          ever watching. They are observing the stats. */}
      <Pane
        label="CROWD"
        style={{
          // NOT TALLER THAN THE CROWD ACTUALLY DRAWS. `Crowd` renders at a
          // fixed 300px on purpose, so a pane taller than that is a pane with
          // an empty band under the back row rather than more crowd.
          height: summaryUp ? (compact ? "180px" : "300px") : compact ? "120px" : "190px",
          flexShrink: 0,
          transition: "height 420ms ease",
        }}
      >
        <Crowd uv={settings.starlight} />
      </Pane>
    </div>
  );

  const panel = (
    <>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button
              appearance="subtle"
              aria-label="Close"
              icon={<DismissRegular />}
              onClick={() => setDrawer(false)}
            />
          }
        >
          <span
            style={{ fontFamily: art.mono, fontSize: "0.95rem", letterSpacing: "0.16em", color: art.accent }}
          >
            BOWLERS &amp; CONTROLS
          </span>
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem", paddingBottom: "1rem" }}>
          <Controls
            players={players}
            settings={settings}
            onPlayersChange={changePlayers}
            onSettingsChange={setSettings}
          />
        </div>
      </DrawerBody>
    </>
  );

  return (
    <div className={s.page}>
      {/* ── the bar: left · centre · right ─────────────────────────── */}
      <div className={s.bar}>
        {/* LEFT — who you are and the way out */}
        <div className={s.barLeft}>
          <Button appearance="subtle" icon={<ArrowLeftRegular />} href="#/" as="a">
            Back
          </Button>
          <h1 className={s.title}>BOWLING ENGINE</h1>
        </div>

        {/* CENTRE — the score, and nothing else. It is the one thing on this
            page somebody looks up at mid-throw, so it holds the middle and
            never shifts as controls come and go around it. */}
        <div className={s.barCentre}>
          <span className={s.total}>
            {players
              .map((p, i) => `${bowlerLabel(p.kind).toUpperCase()} ${totalScore(match.games[i])}`)
              .join("  ·  ")}
            {over ? "  ·  GAME OVER" : ""}
          </span>
        </div>

        {/* RIGHT — settings and the essential controls */}
        <div className={s.barRight}>
          {/* On a phone the BOWLERS pane is not rendered, so the per-bowler
              Roll has nowhere to live — the bar keeps one instead. */}
          {compact && !settings.autoRoll && (
            <Button appearance="primary" disabled={over || busy || held} onClick={() => rollRef.current()}>
              Roll
            </Button>
          )}
          {/* ICON ONLY ON A PHONE. "New game" wrapped to two lines in the bar
              and pushed the score off centre; the icon says it on its own, and
              the label survives as the accessible name rather than being lost
              with the text. */}
          <Button
            appearance="secondary"
            icon={<ReplayRegular />}
            onClick={newGame}
            aria-label="New game"
            title="New game"
          >
            {compact ? undefined : "New game"}
          </Button>
          <Button
            appearance={drawer ? "primary" : "secondary"}
            icon={<SettingsRegular />}
            aria-label="Bowlers and controls"
            aria-expanded={drawer}
            onClick={() => setDrawer((d) => !d)}
          />
        </div>
      </div>
      <div className={s.body} style={{ position: "relative" }}>
        {stage}
        {compact ? (
          <OverlayDrawer
            open={drawer}
            position="bottom"
            onOpenChange={(_, d) => setDrawer(d.open)}
            style={{ height: "82vh", background: art.bg, borderTop: `1px solid ${art.accent}55` }}
          >
            {panel}
          </OverlayDrawer>
        ) : (
          <InlineDrawer
            open={drawer}
            position="end"
            separator
            style={{
              width: "min(38%, 420px)",
              background: "transparent",
              borderLeft: `1px solid ${art.border}`,
            }}
          >
            {panel}
          </InlineDrawer>
        )}
      </div>
    </div>
  );
}
