import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button, Switch, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowLeftRegular, ReplayRegular } from "@fluentui/react-icons";
import type { PinId } from "../engine";
import { FULL_RACK, currentFrameIndex, isGameOver, standingAfter, useBowlingSim } from "../engine";
import { art } from "../ui/theme";
import { LaneView, type LaneRoll, type LaneStyle } from "../ui/Lane";
import { LANE_CYCLE, LANE_CYCLE_S } from "../ui/laneCycle";
import { Overhead } from "../ui/Overhead";
import { Crowd } from "../ui/Crowd";
import { CoachPanel } from "../ui/Coach";
import { Scoreboard } from "../ui/Scoreboard";
import { BowlerFigure } from "../ui/Bowlers";
import { BOWLER_KINDS, bowlerBall, bowlerLabel, type BowlerKind } from "../ui/roster";
import { SKILL_LEVELS, rollForSkill, skillLabel, type SkillLevel } from "../ui/skill";
import { useCompactLayout } from "../ui/useCompactLayout";

/**
 * The tool, as a room: a grid of panes — the lane, the overhead pin view,
 * whoever is bowling, the coach, and the stands — with the wax-pencil
 * scoresheet writing itself in underneath.
 *
 * Every pane renders what the engine reports and nothing else. The lane
 * animates `standingAfter()`; the overhead lights it; the coach reacts to
 * `classifyMood` transitions; the scoresheet is `scoreFrame()` mark by mark.
 * Autobowl and the Roll button are the SAME driver at two paces — one roll,
 * one `applyRoll`, whichever way it arrives.
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
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: "12px",
    paddingBottom: "12px",
    borderBottom: `1px solid ${art.border}`,
  },
  title: {
    fontFamily: art.mono,
    fontSize: "1.05rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: art.accent,
  },
  spacer: { flex: 1 },
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
    flexDirection: "column",
    gap: "12px",
    padding: "14px 20px 20px",
    maxWidth: "1240px",
    width: "100%",
    marginLeft: "auto",
    marginRight: "auto",
    boxSizing: "border-box",
    "@media (max-width: 640px)": { padding: "10px 10px 16px" },
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    rowGap: "10px",
  },
  controlGroup: { display: "flex", alignItems: "center", gap: "6px" },
  controlLabel: {
    fontFamily: art.mono,
    fontSize: "0.68rem",
    letterSpacing: "0.18em",
    color: art.muted,
    marginRight: "4px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "230px 1fr 200px",
    gridTemplateRows: "minmax(320px, 1fr) 140px",
    gridTemplateAreas: `"overhead lane bowler" "coach crowd crowd"`,
    gap: "12px",
    minHeight: 0,
  },
  gridCompact: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  compactRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
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
  paneFill: { position: "absolute", inset: 0 },
  padded: { position: "absolute", inset: "18px 8px 6px" },
  board: {
    border: `1px solid ${art.border}`,
    borderRadius: "10px",
    background: art.panel,
    padding: "6px 4px",
    aspectRatio: "1000 / 190",
    minHeight: "120px",
  },
});

function Pane({ label, area, children }: { label: string; area?: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <div className={s.pane} style={area ? { gridArea: area } : { height: "100%" }}>
      <span className={s.paneLabel}>{label}</span>
      <div className={s.paneFill}>{children}</div>
    </div>
  );
}

export function EnginePage() {
  const s = useStyles();
  const compact = useCompactLayout();
  const [bowler, setBowler] = useState<BowlerKind>("dev");
  const [skill, setSkill] = useState<SkillLevel>("league");
  const [starlight, setStarlight] = useState(false);
  const [auto, setAuto] = useState(true);

  // ONE driver for both paces: the hook's manual mode, fed by rollForSkill.
  // Autobowl is just this same call on the lane's own clock.
  const sim = useBowlingSim("manual", {});
  const simRef = useRef(sim);
  simRef.current = sim;

  const rollOnce = () => {
    const cur = simRef.current;
    if (!cur || cur.gameOver) return;
    const fi = currentFrameIndex(cur.game);
    if (fi === null) return;
    const frame = cur.game.frames[fi];
    const standing: readonly PinId[] =
      frame && frame.rolls.length > 0 ? standingAfter(frame, frame.rolls.length - 1) : FULL_RACK;
    cur.roll(rollForSkill(skill, standing));
  };
  const rollRef = useRef(rollOnce);
  rollRef.current = rollOnce;

  const gameOver = sim?.gameOver ?? false;
  useEffect(() => {
    if (!auto || gameOver) return;
    const first = setTimeout(() => rollRef.current(), 700);
    const id = setInterval(() => rollRef.current(), CYCLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [auto, gameOver]);

  // Everything the lane animates, derived from the game the engine holds.
  const roll = useMemo<LaneRoll | undefined>(() => {
    if (!sim) return undefined;
    const { game } = sim;
    let fi = -1;
    for (let i = 0; i < game.frames.length; i++) if (game.frames[i].rolls.length > 0) fi = i;
    if (fi < 0) return undefined;
    const frame = game.frames[fi];
    const ri = frame.rolls.length - 1;
    const standingBefore = ri === 0 ? FULL_RACK : standingAfter(frame, ri - 1);
    const pinsLeft = standingAfter(frame, ri);
    const felled = frame.pinfall?.[ri] ?? [];
    const cleared = felled.length === standingBefore.length;
    const sameFrameContinues = currentFrameIndex(game) === fi && !isGameOver(game);
    return {
      id: game.frames.reduce((n, f) => n + f.rolls.length, 0),
      standingBefore,
      felled,
      pinsLeft,
      reset: !cleared && sameFrameContinues ? "partial" : "full",
    };
  }, [sim]);

  // The overhead graphic and the coach hold their breath until IMPACT: the
  // engine knows the leave the moment the roll is applied, but showing it
  // while the ball is still rolling down-lane spoils the throw.
  const rollId = roll?.id;
  const latestRef = useRef({ roll, mood: sim?.mood ?? ("idle" as const) });
  latestRef.current = { roll, mood: sim?.mood ?? ("idle" as const) };
  const [shownStanding, setShownStanding] = useState<readonly PinId[]>(FULL_RACK);
  const [shownMood, setShownMood] = useState<typeof latestRef.current.mood>("idle");
  useEffect(() => {
    const r = latestRef.current.roll;
    if (!r) {
      setShownStanding(FULL_RACK);
      setShownMood("idle");
      return;
    }
    setShownStanding(r.standingBefore);
    const t = setTimeout(
      () => {
        setShownStanding(latestRef.current.roll?.pinsLeft ?? FULL_RACK);
        setShownMood(latestRef.current.mood);
      },
      (LANE_CYCLE.roll + 0.15) * 1000,
    );
    return () => clearTimeout(t);
  }, [rollId]);

  if (!sim) return null;

  const laneStyle: LaneStyle = starlight ? "starlight" : "classic";

  const lanePane = (
    <Pane label={`LANE · ${starlight ? "STARLIGHT" : "CLASSIC"}`} area={compact ? undefined : "lane"}>
      <LaneView laneStyle={laneStyle} standing={FULL_RACK} roll={roll} ballTint={bowlerBall(bowler)} laneNumber={7} />
    </Pane>
  );

  return (
    <div className={s.page}>
      <div className={s.bar}>
        <Button appearance="subtle" icon={<ArrowLeftRegular />} href="#/" as="a">
          Back
        </Button>
        <span className={s.title}>BOWLING ENGINE</span>
        <span className={s.spacer} />
        <span className={s.total}>
          TOTAL {sim.total}
          {gameOver ? " · GAME OVER" : ""}
        </span>
      </div>
      <div className={s.body}>
        {/* ── the knobs ─────────────────────────────────────────────── */}
        <div className={s.controls}>
          <span className={s.controlGroup}>
            <span className={s.controlLabel}>BOWLER</span>
            {BOWLER_KINDS.map((k) => (
              <Button key={k} size="small" appearance={bowler === k ? "primary" : "secondary"} onClick={() => setBowler(k)}>
                {bowlerLabel(k)}
              </Button>
            ))}
          </span>
          <span className={s.controlGroup}>
            <span className={s.controlLabel}>SKILL</span>
            {SKILL_LEVELS.map((k) => (
              <Button key={k} size="small" appearance={skill === k ? "primary" : "secondary"} onClick={() => setSkill(k)}>
                {skillLabel(k)}
              </Button>
            ))}
          </span>
          <Switch label="Starlight" checked={starlight} onChange={(_, d) => setStarlight(d.checked)} />
          <Switch label="Autobowl" checked={auto} onChange={(_, d) => setAuto(d.checked)} />
          {!auto && (
            <Button appearance="primary" disabled={gameOver} onClick={() => rollRef.current()}>
              Roll
            </Button>
          )}
          <Button icon={<ReplayRegular />} onClick={() => sim.reset()}>
            New game
          </Button>
        </div>

        {/* ── the room ──────────────────────────────────────────────── */}
        {compact ? (
          <div className={s.gridCompact}>
            <div style={{ aspectRatio: "900 / 520" }}>{lanePane}</div>
            <div className={s.compactRow} style={{ minHeight: "180px" }}>
              <Pane label="OVERHEAD">
                <div className={s.padded}>
                  <Overhead standing={shownStanding} />
                </div>
              </Pane>
              <Pane label="BOWLER">
                <div className={s.padded}>
                  <BowlerFigure kind={bowler} />
                </div>
              </Pane>
            </div>
            <div className={s.board}>
              <Scoreboard game={sim.game} playerName={bowlerLabel(bowler).toUpperCase()} />
            </div>
            <div style={{ minHeight: "96px" }} className={s.pane}>
              <span className={s.paneLabel}>COACH</span>
              <div className={s.paneFill}>
                <CoachPanel mood={shownMood} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={s.grid} style={{ flex: 1 }}>
              <Pane label="OVERHEAD" area="overhead">
                <div className={s.padded}>
                  <Overhead standing={shownStanding} />
                </div>
              </Pane>
              {lanePane}
              <Pane label="BOWLER" area="bowler">
                <div className={s.padded}>
                  <BowlerFigure kind={bowler} />
                </div>
              </Pane>
              <Pane label="COACH" area="coach">
                <CoachPanel mood={shownMood} />
              </Pane>
              <Pane label="CROWD" area="crowd">
                <Crowd uv={starlight} />
              </Pane>
            </div>
            <div className={s.board}>
              <Scoreboard game={sim.game} playerName={bowlerLabel(bowler).toUpperCase()} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
