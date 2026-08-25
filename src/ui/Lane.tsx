import type { CSSProperties, ReactNode } from "react";
import type { PinId } from "../engine";
import { FULL_RACK } from "../engine";
import { art } from "./theme";
import { LANE_CYCLE_S, LANE_KEYFRAMES } from "./laneCycle";

/**
 * The lane, front view — the main pane of the engine page.
 *
 * Ported from the art this engine originally drove, and consumed the same way
 * an outside developer would consume it: everything that moves here renders
 * what the engine REPORTS. The pins that explode are the ones missing from
 * `standingAfter()`; the machine runs a partial or a full reset because of
 * what the rolls say happened; nothing re-derives a rule of its own.
 *
 * A `style` changes palette and the masking unit's graphic — never the
 * geometry, the projection math, or the machine cycle.
 */

export type LaneStyle = "classic" | "starlight";

/** What the latest roll did, in engine terms — everything the scene animates. */
export interface LaneRoll {
  /** Remount key: a new id replays the cycle for the new roll. */
  id: number;
  /** Pins standing when the ball left the hand. */
  standingBefore: readonly PinId[];
  /** Pins felled by this roll. */
  felled: readonly PinId[];
  /** The leave — standingAfter() for this roll. */
  pinsLeft: readonly PinId[];
  /**
   * partial = the frame continues, the machine lifts the leave and rakes the
   * deadwood; full = the frame (or rack) is done — everything is swept and a
   * fresh set of ten is lowered in.
   */
  reset: "partial" | "full";
}

// CSS custom properties in inline styles need one widening cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cssVars = (o: Record<string, string | number>) => o as any as CSSProperties;

// ── One pin, upright — the classic silhouette with two neck stripes ─────────
export function Pin({
  x,
  y,
  s = 1,
  tone,
  stripe,
}: {
  x: number;
  y: number;
  s?: number;
  tone?: string;
  stripe?: string;
}) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <path
        d="M 0 -46 C 8 -46 11 -40 10 -33 C 9.4 -27 7 -23 7 -17 C 7 -8 15 -2 15 12 C 15 26 8 32 0 32 C -8 32 -15 26 -15 12 C -15 -2 -7 -8 -7 -17 C -7 -23 -9.4 -27 -10 -33 C -11 -40 -8 -46 0 -46 Z"
        fill={tone ?? art.pin}
        stroke="#c9c0ab"
        strokeWidth="1.4"
      />
      <path d="M -7.6 -22 L 7.6 -22" stroke={stripe ?? art.pinStripe} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M -7.1 -15.5 L 7.1 -15.5" stroke={stripe ?? art.pinStripe} strokeWidth="2.6" strokeLinecap="round" />
      {/* a soft left-side shade so the pin reads as round */}
      <path d="M -9 -30 C -12 -14 -13 8 -8 26 C -12 20 -15 8 -14 -4 C -13 -16 -11 -25 -9 -30 Z" fill="#00000022" />
    </g>
  );
}

// ── The rack, in shallow perspective, driven by the engine's leave ──────────
const RACK_POS: Record<PinId, { x: number; y: number }> = {
  7: { x: -96, y: -58 },
  8: { x: -32, y: -58 },
  9: { x: 32, y: -58 },
  10: { x: 96, y: -58 },
  4: { x: -64, y: -30 },
  5: { x: 0, y: -30 },
  6: { x: 64, y: -30 },
  2: { x: -32, y: -4 },
  3: { x: 32, y: -4 },
  1: { x: 0, y: 22 },
};

function StandingRack({
  x,
  y,
  s = 1,
  depth = 22,
  standing,
  roll,
}: {
  x: number;
  /** the DECK LINE: the head pin's base sits exactly here */
  y: number;
  s?: number;
  depth?: number;
  /** the idle rack when no roll is playing */
  standing: readonly PinId[];
  roll?: LaneRoll;
}) {
  // Perspective placement: t = 0 back row … 1 head pin. Back row sits deeper,
  // narrower, smaller — and DARKER: the pin light falls from the front-top,
  // so each row back sinks into the machine's shadow (discrete tone bands).
  const place = (p: PinId) => {
    const t = (RACK_POS[p].y + 58) / 112;
    const ps = s * (0.78 + 0.22 * t);
    const shade =
      t < 0.3
        ? { tone: "#bfb8a8", stripe: "#96423d" }
        : t < 0.62
          ? { tone: "#dcd5c4", stripe: "#c04a44" }
          : { tone: art.pin, stripe: art.pinStripe };
    return {
      cx: x + RACK_POS[p].x * s * (0.84 + 0.16 * t),
      baseY: y - (1 - t) * depth,
      ps,
      shade,
    };
  };

  // Which journey does each pin take through this roll's cycle?
  const anim = (p: PinId): { name: string | null; render: boolean } => {
    if (!roll) return { name: null, render: standing.includes(p) };
    const wasUp = roll.standingBefore.includes(p);
    const fell = roll.felled.includes(p);
    if (fell) return { name: roll.reset === "full" ? `be-pinfull-${["a", "b", "c"][p % 3]}` : `be-pinfly-${["a", "b", "c"][p % 3]}`, render: true };
    if (wasUp) return { name: roll.reset === "full" ? "be-pinsweep" : "be-pinlift", render: true };
    // Down before the ball ever left the hand: on a full reset it returns
    // with the fresh rack; on a partial it simply is not there.
    return { name: roll.reset === "full" ? "be-pinarrive" : null, render: roll.reset === "full" };
  };

  return (
    <g>
      {FULL_RACK.map((p) => {
        const j = anim(p);
        if (!j.render) return null;
        const { cx, baseY, ps, shade } = place(p);
        const style = j.name
          ? {
              transformBox: "fill-box" as const,
              transformOrigin: "50% 85%",
              animation: `${j.name} ${LANE_CYCLE_S}s linear 1 both`,
            }
          : undefined;
        // Pin's local base is at +32; anchor the BASE to the deck line. The
        // wrapper carries the animation (no transform attribute of its own —
        // a CSS transform animation overrides an attribute transform).
        return (
          <g key={p} style={style}>
            <Pin x={cx} y={baseY - 32 * ps} s={ps} tone={shade.tone} stripe={shade.stripe} />
          </g>
        );
      })}
    </g>
  );
}

// ── The lane bed — converging boards, arrows, dots, gutters, pin deck ───────
function LaneBed({
  x,
  topY,
  bottomY,
  topW,
  bottomW,
  style,
}: {
  x: number;
  topY: number;
  bottomY: number;
  topW: number;
  bottomW: number;
  style: LaneStyle;
}) {
  const uv = style === "starlight";
  // one palette object per style — the same geometry, a different night
  const pal = uv
    ? {
        gutter: "#0d1030",
        bedA: art.uvBed,
        bedB: art.uvBedDeep,
        board: art.uvViolet,
        boardShade: "#ffffff10",
        mark: art.uvCyan,
        foul: art.uvMagenta,
        sheen: art.uvCyan,
        sheenO: 0.14,
        deck: "#0a0b1e",
        glow: art.uvViolet,
        markGlow: true,
      }
    : {
        gutter: art.gutter,
        bedA: art.laneWood,
        bedB: art.laneWoodDeep,
        board: art.board,
        boardShade: "#00000018",
        mark: "#5a3820",
        foul: "#3a2c1d",
        sheen: "#ffe9c0",
        sheenO: 0.055,
        deck: art.deck,
        glow: art.deckGlow,
        markGlow: false,
      };
  const gradId = uv ? "be-lane-bed-uv" : "be-lane-bed";
  const half = (w: number) => w / 2;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const edgeAt = (t: number, side: 1 | -1) => x + side * lerp(half(bottomW), half(topW), t);
  const yAt = (t: number) => lerp(bottomY, topY, t);
  const gutterW = (t: number) => lerp(bottomW * 0.085, topW * 0.085, t);
  // REAL projection along the lane's 60ft: apparent size ∝ 1/distance, and
  // the trapezoid's own width ratio tells us where the viewer stands. tOf(d)
  // maps a real distance in feet from the foul line to a screen fraction —
  // dots at 6ft land ~20% up the lane, arrows at 15ft ~43%, and equal 10ft
  // steps visibly compress.
  const zr = topW / bottomW;
  const z0 = (60 * zr) / (1 - zr);
  const tOf = (dFt: number) => (1 - z0 / (z0 + dFt)) / (1 - z0 / (z0 + 60));
  return (
    <g>
      {/* gutters — the dark channels flanking the bed */}
      {([1, -1] as const).map((side) => (
        <polygon
          key={side}
          points={`${edgeAt(0, side)},${bottomY} ${edgeAt(0, side) + side * gutterW(0)},${bottomY} ${edgeAt(1, side) + side * gutterW(1)},${topY} ${edgeAt(1, side)},${topY}`}
          fill={pal.gutter}
        />
      ))}
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={pal.bedA} />
          <stop offset="1" stopColor={pal.bedB} />
        </linearGradient>
      </defs>
      <polygon
        points={`${edgeAt(0, -1)},${bottomY} ${edgeAt(0, 1)},${bottomY} ${edgeAt(1, 1)},${topY} ${edgeAt(1, -1)},${topY}`}
        fill={`url(#${gradId})`}
      />
      {/* boards — alternating two-tone stripes, converging: the perspective engine */}
      {[-1, -0.78, -0.56, -0.34, -0.12, 0.12, 0.34, 0.56].map((f, i) =>
        i % 2 === 0 ? (
          <polygon
            key={`b${f}`}
            points={`${x + f * half(bottomW)},${bottomY} ${x + (f + 0.22) * half(bottomW)},${bottomY} ${x + (f + 0.22) * half(topW)},${topY} ${x + f * half(topW)},${topY}`}
            fill={pal.boardShade}
          />
        ) : null,
      )}
      {[-0.78, -0.56, -0.34, -0.12, 0.12, 0.34, 0.56, 0.78].map((f) => (
        <line
          key={f}
          x1={x + f * half(bottomW)}
          y1={bottomY}
          x2={x + f * half(topW)}
          y2={topY}
          stroke={pal.board}
          strokeWidth="1.6"
          opacity="0.45"
        />
      ))}
      {/* the foul line — a hard boundary, not a suggestion */}
      <rect x={edgeAt(0, -1) - gutterW(0)} y={bottomY - 5} width={bottomW + gutterW(0) * 2} height={5} fill={pal.foul} opacity="0.9" />
      {/* equal 10ft steps of lane, compressing with distance — subtle sheen bands */}
      {[10, 20, 30, 40, 50].map((d) => {
        const t = tOf(d);
        return (
          <line
            key={d}
            x1={edgeAt(t, -1)}
            y1={yAt(t)}
            x2={edgeAt(t, 1)}
            y2={yAt(t)}
            stroke={pal.sheen}
            strokeWidth={lerp(5, 1.6, t)}
            opacity={pal.sheenO}
          />
        );
      })}
      {/* the arrow chevron — REAL placement: 15ft down-lane, projected */}
      {[-0.62, -0.42, -0.21, 0, 0.21, 0.42, 0.62].map((f, i) => {
        const t = tOf(15 + (i === 3 ? 2.5 : Math.abs(f) < 0.45 ? 1.2 : 0));
        const ax = x + f * lerp(half(bottomW), half(topW), t);
        const ay = yAt(t);
        const sw = lerp(13, 6, t);
        return (
          <polygon
            key={f}
            points={`${ax},${ay - sw * 1.5} ${ax - sw / 2},${ay} ${ax + sw / 2},${ay}`}
            fill={pal.mark}
            opacity="0.85"
            style={pal.markGlow ? { filter: `drop-shadow(0 0 5px ${pal.mark})` } : undefined}
          />
        );
      })}
      {/* approach dots — REAL placement: 6ft down-lane, projected */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((f) => {
        const t = tOf(6);
        return (
          <circle
            key={f}
            cx={x + f * lerp(half(bottomW), half(topW), t) * 0.9}
            cy={yAt(t)}
            r={lerp(4.8, 2.4, t)}
            fill={pal.mark}
            opacity="0.8"
            style={pal.markGlow ? { filter: `drop-shadow(0 0 5px ${pal.mark})` } : undefined}
          />
        );
      })}
      {/* the pin deck — recessed, darker, with its light strip */}
      <rect x={edgeAt(1, -1) - gutterW(1)} y={topY - 26} width={topW + gutterW(1) * 2} height={26} fill={pal.deck} />
      <rect
        x={edgeAt(1, -1) - gutterW(1)}
        y={topY - 26}
        width={topW + gutterW(1) * 2}
        height={4}
        fill={pal.glow}
        opacity={0.7}
        style={{ filter: `drop-shadow(0 0 8px ${pal.glow})` }}
      />
    </g>
  );
}

// ── Machine face — the pinsetter as the BOWLER sees it ──────────────────────
// A dark fascia at the end of the lane with a lit opening, pins sitting
// inside it at lane perspective, the sweeper blade along the opening's top
// edge. Fresh pins arrive INTO that same view; the machinery stays hidden.
function MachineFace({
  x,
  y,
  w,
  openH = 100,
  style,
  laneNumber,
  animateGate,
  children,
}: {
  x: number;
  /** the deck line — the bottom of the opening */
  y: number;
  w: number;
  openH?: number;
  style: LaneStyle;
  laneNumber: number;
  /** run one gate pass on the shared clock (a roll is playing) */
  animateGate: boolean;
  children?: ReactNode;
}) {
  const half = w / 2;
  const travel = openH - 16;
  const uv = style === "starlight";
  const light = uv ? art.uvViolet : "#e8f2f6";
  // THE MASKING UNIT — the wide flat panel above the deck: painted graphics
  // by day, a backlit panel under blacklight. It runs the length of the
  // house, so it bleeds past this lane on purpose — a sign, never a box.
  const panelH = Math.round(openH * 0.58);
  const panelW = Math.round(w * 2.1);
  const panelY = y - openH - panelH;
  const maskId = `be-unit-fade-${laneNumber}`;
  return (
    <g>
      {/* interior — the dark mouth of the machine, cool-lit from above */}
      <rect x={x - half} y={y - openH} width={w} height={openH} fill={uv ? "#0a0b1e" : "#0b0f12"} />
      <path
        d={`M ${x - half * 0.5} ${y - openH} L ${x + half * 0.5} ${y - openH} L ${x + half * 0.96} ${y - 4} L ${x - half * 0.96} ${y - 4} Z`}
        fill={light}
        opacity={uv ? 0.17 : 0.11}
      />
      {/* the pins, clipped to the opening: the blast happens inside the pit */}
      <clipPath id={`be-pit-${laneNumber}`}>
        <rect x={x - half} y={y - openH} width={w} height={openH + 6} />
      </clipPath>
      <g clipPath={`url(#be-pit-${laneNumber})`}>{children}</g>
      {/* the sweeper blade — the only mechanism the bowler ever sees move */}
      <g
        style={
          animateGate
            ? { ...cssVars({ "--gd": `${travel}px` }), animation: `be-gate ${LANE_CYCLE_S}s linear 1 both` }
            : undefined
        }
      >
        <rect x={x - half - 8} y={y - openH + 2} width={w + 16} height={10} rx="5" fill={uv ? "#2a2f52" : "#5c7080"} stroke={uv ? "#12142e" : "#2c333a"} strokeWidth="2" />
        <rect x={x - half - 8} y={y - openH + 10} width={w + 16} height={3} fill="#1a2025" />
      </g>
      {/* the deck curtain edges — thin, dark, not pillars */}
      <rect x={x - half - 6} y={y - openH} width={6} height={openH} fill={uv ? "#12142e" : "#1d2428"} />
      <rect x={x + half} y={y - openH} width={6} height={openH} fill={uv ? "#12142e" : "#1d2428"} />
      {/* THE MASKING UNIT */}
      {uv ? (
        <g>
          <rect x={x - panelW / 2} y={panelY} width={panelW} height={panelH} fill="#1a1c4a" />
          {[0.18, 0.5, 0.82].map((f, i) => (
            <rect
              key={f}
              x={x - panelW / 2 + panelW * f - 16}
              y={panelY + panelH * 0.18}
              width="32"
              height={panelH * 0.64}
              rx="6"
              fill={i % 2 === 0 ? art.uvCyan : art.uvMagenta}
              opacity="0.75"
              style={{ filter: `drop-shadow(0 0 10px ${i % 2 === 0 ? art.uvCyan : art.uvMagenta})` }}
            />
          ))}
          <path d={`M ${x - panelW / 2} ${panelY + panelH * 0.5} L ${x + panelW / 2} ${panelY + panelH * 0.5}`} stroke={art.uvViolet} strokeWidth="2" opacity="0.5" />
        </g>
      ) : (
        <g>
          {/* the 1950s house: one BIG solid color block per lane, a center
              lamp, a faceted chamfered lower lip, cream apron beneath. The
              unit runs the whole house, so its ends FADE rather than cut. */}
          <defs>
            <linearGradient id={`${maskId}-g`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" />
              <stop offset="0.22" stopColor="#fff" />
              <stop offset="0.78" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <mask id={maskId}>
              <rect x={x - panelW / 2} y={panelY} width={panelW} height={panelH} fill={`url(#${maskId}-g)`} />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            {[-2, -1, 0, 1, 2].map((k) => {
              const blockW = w + 24;
              const bx = x + k * blockW - blockW / 2;
              const tone = k === 0 ? "#3f9f92" : "#2f6b70";
              const lipH = panelH * 0.3;
              return (
                <g key={k}>
                  <rect x={bx} y={panelY} width={blockW} height={panelH - lipH} fill={tone} />
                  <polygon
                    points={`${bx},${panelY + panelH - lipH} ${bx + blockW},${panelY + panelH - lipH} ${bx + blockW - 10},${panelY + panelH} ${bx + 10},${panelY + panelH}`}
                    fill="#fff6e0"
                    opacity="0.92"
                  />
                  <polygon points={`${bx},${panelY + panelH - lipH} ${bx + 10},${panelY + panelH} ${bx},${panelY + panelH}`} fill="#00000030" />
                  <ellipse
                    cx={bx + blockW / 2}
                    cy={panelY + (panelH - lipH) / 2}
                    rx={blockW * 0.16}
                    ry={(panelH - lipH) * 0.3}
                    fill="#fff6e0"
                    style={{ filter: "drop-shadow(0 0 8px #fff6e0)" }}
                  />
                  <rect x={bx + blockW - 2} y={panelY} width="4" height={panelH} fill="#1d2428" opacity="0.7" />
                </g>
              );
            })}
          </g>
        </g>
      )}
      {uv && (
        /* Starlight: the pins washed in light — one violet glow over the
           whole rack, never lit pin by pin */
        <ellipse cx={x} cy={y - openH * 0.42} rx={half * 0.62} ry={openH * 0.36} fill={art.uvViolet} opacity="0.22" style={{ filter: `drop-shadow(0 0 14px ${art.uvViolet})` }} />
      )}
      {/* the lane number — a small plaque at the unit's foot */}
      <rect x={x - 16} y={y - openH - 14} width="32" height="16" rx="3" fill={uv ? "#0a0b1e" : "#20272b"} />
      <text x={x} y={y - openH - 2} textAnchor="middle" fontFamily={art.mono} fontSize="12" fontWeight="800" fill={uv ? art.uvCyan : "#f2e8d2"} opacity="0.9">
        {laneNumber}
      </text>
    </g>
  );
}

// ── The scene ───────────────────────────────────────────────────────────────

const LANE_X = 450;
const DECK_Y = 190;
const FOUL_Y = 505;
const TOP_W = 155;
const BOTTOM_W = 430;

export function LaneView({
  laneStyle = "classic",
  standing,
  roll,
  ballTint = "#26343c",
  laneNumber = 1,
}: {
  laneStyle?: LaneStyle;
  /** the idle rack — what stands when no roll is playing */
  standing: readonly PinId[];
  /** the roll currently playing through the machine cycle, if any */
  roll?: LaneRoll;
  ballTint?: string;
  laneNumber?: number;
}) {
  const uv = laneStyle === "starlight";
  // A ball that felled nothing found the channel: it drifts off the boards
  // on the way down-lane instead of running to the pocket.
  const gutter = roll !== undefined && roll.felled.length === 0;
  return (
    <svg viewBox="0 0 900 520" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <style>{LANE_KEYFRAMES}</style>
      {/* the room */}
      <rect x="0" y="0" width="900" height="520" fill={uv ? art.uvRoom : art.room} />
      <rect x="0" y="0" width="900" height={DECK_Y} fill={uv ? "#12143a" : art.roomWall} opacity="0.55" />
      <LaneBed x={LANE_X} topY={DECK_Y} bottomY={FOUL_Y} topW={TOP_W} bottomW={BOTTOM_W} style={laneStyle} />
      {/* the roll — same clock as the pins and the gate */}
      {roll && (
        <g key={`ball-${roll.id}`} transform={`translate(${LANE_X}, ${FOUL_Y - 16})`}>
          <g
            style={{
              ...cssVars({ "--ty": "-296px", "--tx": gutter ? "-100px" : "0px" }),
              animation: `be-throw ${LANE_CYCLE_S}s linear 1 both`,
            }}
          >
            <circle r="20" fill={ballTint} stroke="#0d1215" strokeWidth="2" style={uv ? { filter: `drop-shadow(0 0 8px ${ballTint})` } : undefined} />
            <path d="M -12 -9 A 15 15 0 0 1 7 -14" stroke="#ffffff" strokeWidth="2.4" fill="none" opacity="0.4" strokeLinecap="round" />
          </g>
        </g>
      )}
      <MachineFace x={LANE_X} y={DECK_Y} w={TOP_W + 36} openH={100} style={laneStyle} laneNumber={laneNumber} animateGate={roll !== undefined}>
        <g key={roll ? `rack-${roll.id}` : "rack-idle"}>
          <StandingRack x={LANE_X} y={DECK_Y - 5} s={0.45} depth={22} standing={standing} roll={roll} />
        </g>
      </MachineFace>
    </svg>
  );
}
