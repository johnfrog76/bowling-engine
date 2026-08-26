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
import { BowlerFigure } from "../ui/Bowlers";
import { bowlerBall, bowlerLabel } from "../ui/roster";
import { rollForSkill } from "../ui/skill";
import { Controls } from "../ui/Controls";
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
  barRight: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", flex: 1, minWidth: 0 },
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
    borderRadius: "8px",
    border: `1px solid ${art.border}`,
    background: "rgba(8,7,16,0.62)",
    backdropFilter: "blur(2px)",
    pointerEvents: "none",
  },
  chipLabel: {
    position: "absolute",
    top: "4px",
    left: "7px",
    fontFamily: art.mono,
    fontSize: "0.52rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: art.muted,
  },
  chipBody: { position: "absolute", inset: "16px 6px 5px" },
  lower: { display: "flex", gap: "12px", minHeight: "132px" },
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
    borderLeft: `2px solid ${art.accent}`,
    pointerEvents: "none",
  },
  paneLabelUp: { color: art.bg, background: art.accent, borderLeftColor: art.accent },
  paneFill: { position: "absolute", inset: 0 },
  padded: { position: "absolute", inset: "18px 8px 6px" },
  // The scoresheets are a BAND, not a panel that grows with the page. Sized by
  // aspect ratio they took nearly half the height at desktop width and left the
  // lanes a sliver — and the lane is what people came to watch. A fixed band
  // keeps the sheet legible (its SVG scales to fit) and gives the rest back.
  boards: { display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 },
  board: {
    border: `1px solid ${art.border}`,
    borderRadius: "10px",
    background: art.panel,
    padding: "2px 4px",
    height: "116px",
    "@media (max-width: 640px)": { height: "96px" },
  },
});

function Pane({
  label,
  highlight,
  children,
  style,
  className,
}: {
  label: string;
  highlight?: boolean;
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const s = useStyles();
  return (
    <div className={`${s.pane} ${className ?? ""}`} style={style}>
      <span className={`${s.paneLabel} ${highlight ? s.paneLabelUp : ""}`}>{label}</span>
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
    }
  };

  const up = bowlerUp(match);
  const over = isMatchOver(match);

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

  const stateRef = useRef({ match, players, up });
  stateRef.current = { match, players, up };

  const rollOnce = () => {
    const { match: m, players: ps, up: who } = stateRef.current;
    if (who === null || busyRef.current) return;
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

  useEffect(() => {
    if (!settings.autoRoll || over) return;
    const first = setTimeout(() => rollRef.current(), 700);
    const id = setInterval(() => rollRef.current(), CYCLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [settings.autoRoll, over]);

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
    const t = setTimeout(() => {
      const cur = latestRef.current;
      setShownStanding(cur.activeRoll?.pinsLeft ?? FULL_RACK);
      // The coach reacts to whoever just threw — one room, one commentator.
      if (cur.lastBy !== null && cur.activeRoll) {
        setShownMood(
          classifyMood(cur.match.games[cur.lastBy], { kind: "roll", pins: cur.activeRoll.felled.length }),
        );
      }
    }, (LANE_CYCLE.roll + 0.15) * 1000);
    return () => clearTimeout(t);
  }, [rollId, lastBy]);

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
  const totals = match.games.map((_, i) => i);

  const newGame = () => {
    setMatch(emptyMatch(count));
    setLastBy(null);
    busyRef.current = false;
    setBusy(false);
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
        <Pane
          label={`LANE ${7 + viewIdx} · ${bowlerLabel(players[viewIdx].kind).toUpperCase()}${up === viewIdx ? " · UP" : ""}`}
          highlight
          style={{ flex: 1, minHeight: compact ? "260px" : 0 }}
        >
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
                  standing={idleStanding(match, i)}
                  roll={lastBy === i ? activeRoll : undefined}
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
          <div className={s.overheadChip}>
            <span className={s.chipLabel}>OVERHEAD</span>
            <div className={s.chipBody}>
              <Overhead standing={lastBy === viewIdx ? shownStanding : idleStanding(match, viewIdx)} />
            </div>
          </div>
        </Pane>
        {!compact && (
          <Pane label="BOWLERS" style={{ width: "180px", flexShrink: 0 }}>
            <div
              className={s.padded}
              style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "space-around" }}
            >
              {players.map((p, i) => (
                <div key={i} style={{ position: "relative", flex: 1, minHeight: 0 }}>
                  <div style={{ position: "absolute", inset: 0, opacity: up === i ? 1 : 0.42 }}>
                    <BowlerFigure kind={p.kind} starlight={settings.starlight} />
                  </div>
                  {/* THE BALL IS THROWN BY A PERSON, so the button that throws
                      it is LOCKED AT THAT PERSON'S FEET rather than floating
                      over the stage where it belongs to nobody. One Roll each,
                      live only for whoever is up — which makes whose turn it
                      is something you can see rather than a label to read. */}
                  {!settings.autoRoll && (
                    <Button
                      appearance={up === i ? "primary" : "secondary"}
                      size="small"
                      disabled={up !== i || over || busy}
                      onClick={() => rollRef.current()}
                      style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", minWidth: "74px" }}
                    >
                      Roll
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Pane>
        )}
      </div>

      <div className={s.lower}>
        <Pane label="COACH" style={{ width: "240px", flexShrink: 0 }}>
          <CoachPanel mood={shownMood} />
        </Pane>
        <Pane label="CROWD" style={{ flex: 1, minWidth: 0 }}>
          <Crowd uv={settings.starlight} />
        </Pane>
      </div>

      <div className={s.boards}>
        {totals.map((i) => (
          <div key={i} className={s.board} style={up === i ? { borderColor: art.accent } : undefined}>
            <Scoreboard game={match.games[i]} playerName={`${bowlerLabel(players[i].kind).toUpperCase()}`} />
          </div>
        ))}
      </div>
    </div>
  );

  const panel = (
    <>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={() => setDrawer(false)} />
          }
        >
          <span style={{ fontFamily: art.mono, fontSize: "0.95rem", letterSpacing: "0.16em", color: art.accent }}>
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
            {players.map((p, i) => `${bowlerLabel(p.kind).toUpperCase()} ${totalScore(match.games[i])}`).join("  ·  ")}
            {over ? "  ·  GAME OVER" : ""}
          </span>
        </div>

        {/* RIGHT — settings and the essential controls */}
        <div className={s.barRight}>
          {/* On a phone the BOWLERS pane is not rendered, so the per-bowler
              Roll has nowhere to live — the bar keeps one instead. */}
          {compact && !settings.autoRoll && (
            <Button appearance="primary" disabled={over || busy} onClick={() => rollRef.current()}>
              Roll
            </Button>
          )}
          <Button appearance="secondary" icon={<ReplayRegular />} onClick={newGame}>
            New game
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
            style={{ width: "min(38%, 420px)", background: "transparent", borderLeft: `1px solid ${art.border}` }}
          >
            {panel}
          </InlineDrawer>
        )}
      </div>
    </div>
  );
}
