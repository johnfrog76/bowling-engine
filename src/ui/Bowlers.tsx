import { art } from "./theme";
import type { BowlerKind } from "./roster";
import { bowlerBall } from "./roster";

/**
 * The three bowlers — Alien, Robot, Dev. One skin each, no personalities:
 * Dev is just *a* bowler. The alien and robot are ported from the same art
 * family this engine grew up in (re-drawn into this repo's own file, the way
 * shared shapes travel in this repo family); the dev is seen from behind at
 * the line, the way a bowling shirt says who's up with no caption.
 */

/**
 * The house ball, drawn once. Exported because the curtain holds one up over
 * the lane at forty times this size and a second hand-drawn ball would drift
 * away from this one the first time either is touched.
 */
export function BowlingBall({
  x,
  y,
  r = 22,
  tint = "#26343c",
  glow = false,
}: {
  x: number;
  y: number;
  r?: number;
  tint?: string;
  /** Under blacklight the ball is the brightest thing the bowler is holding. */
  glow?: boolean;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r={r}
        fill={tint}
        stroke="#0d1215"
        strokeWidth="2"
        style={glow ? { filter: `drop-shadow(0 0 ${r * 0.5}px ${tint})` } : undefined}
      />
      <circle cx={-r * 0.26} cy={-r * 0.3} r={r * 0.11} fill="#0d1215" />
      <circle cx={r * 0.07} cy={-r * 0.42} r={r * 0.11} fill="#0d1215" />
      <circle cx={r * 0.26} cy={-r * 0.15} r={r * 0.11} fill="#0d1215" />
      <path
        d={`M ${-r * 0.6} ${-r * 0.5} A ${r * 0.78} ${r * 0.78} 0 0 1 ${r * 0.3} ${-r * 0.72}`}
        stroke="#ffffff"
        strokeWidth="2.5"
        fill="none"
        opacity="0.35"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Classic two-tone 1950s bowling shirt: body + contrast front panel + collar. */
function BowlingShirt({ w, base, panel }: { w: number; base: string; panel: string }) {
  return (
    <g>
      <path
        d={`M ${-w / 2} 0 C ${-w / 2} -8 ${w / 2} -8 ${w / 2} 0 L ${w / 2 - 3} 46 C ${w * 0.28} 54 ${-w * 0.28} 54 ${-w / 2 + 3} 46 Z`}
        fill={base}
      />
      <rect x={-w * 0.16} y={-4} width={w * 0.32} height={50} fill={panel} />
      <path d={`M ${-w * 0.2} -4 L 0 8 L ${w * 0.2} -4`} fill="none" stroke={panel} strokeWidth="4" />
    </g>
  );
}

const SHOE = "#c0463f";
const CREAM = "#f2e8d2";

function AlienFigure({ starlight }: { starlight: boolean }) {
  const ball = bowlerBall("alien", starlight);
  return (
    <svg viewBox="0 0 120 214" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="be-grey" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#d3dadd" />
          <stop offset="1" stopColor="#8e9aa2" />
        </linearGradient>
      </defs>
      {/* legs + tiny rental shoes */}
      <g stroke="url(#be-grey)" strokeWidth="10" strokeLinecap="round" fill="none">
        <path d="M 50 158 L 48 196" />
        <path d="M 70 158 L 72 196" />
      </g>
      <path d="M 34 196 Q 33 204 43 204 L 56 204 Q 58 199 53 196 Z" fill={SHOE} />
      <path d="M 64 196 Q 63 204 73 204 L 86 204 Q 88 199 83 196 Z" fill={SHOE} />
      {/* torso in the bowling shirt */}
      <g transform="translate(60, 102)">
        <BowlingShirt w={40} base={CREAM} panel={SHOE} />
      </g>
      {/* both arms wrap forward — the ball presented at the chest */}
      <path d="M 42 112 Q 34 126 46 132" fill="none" stroke="url(#be-grey)" strokeWidth="8" strokeLinecap="round" />
      <path d="M 78 112 Q 86 126 74 132" fill="none" stroke="url(#be-grey)" strokeWidth="8" strokeLinecap="round" />
      <BowlingBall x={60} y={130} r={17} tint={ball} glow={starlight} />
      <circle cx="47" cy="135" r="5.5" fill="#c3ccd0" />
      <circle cx="73" cy="135" r="5.5" fill="#c3ccd0" />
      {/* neck + head — dome cranium, glossy almonds */}
      <rect x="55" y="86" width="10" height="14" rx="4" fill="#a8b2b8" />
      <path d="M 24 44 C 24 8 96 8 96 44 C 96 66 80 88 60 93 C 40 88 24 66 24 44 Z" fill="url(#be-grey)" />
      <ellipse cx="44" cy="52" rx="14" ry="7.5" fill="#10151a" transform="rotate(-20 44 52)" />
      <ellipse cx="76" cy="52" rx="14" ry="7.5" fill="#10151a" transform="rotate(20 76 52)" />
      <ellipse cx="40" cy="49" rx="4" ry="2" fill="#e8f2f6" opacity="0.6" transform="rotate(-20 40 49)" />
      <ellipse cx="72" cy="49" rx="4" ry="2" fill="#e8f2f6" opacity="0.6" transform="rotate(20 72 49)" />
      <circle cx="57" cy="70" r="1.4" fill="#5c666c" />
      <circle cx="63" cy="70" r="1.4" fill="#5c666c" />
      <path d="M 52 79 Q 60 84 68 79" fill="none" stroke="#5c666c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RobotFigure({ starlight }: { starlight: boolean }) {
  const ball = bowlerBall("robot", starlight);
  return (
    <svg viewBox="0 0 140 232" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="be-robotmetal" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#eef4f7" />
          <stop offset="1" stopColor="#9fb2bf" />
        </linearGradient>
      </defs>
      {/* antenna */}
      <line x1="70" y1="14" x2="70" y2="30" stroke="#8fa2af" strokeWidth="4" />
      <circle cx="70" cy="10" r="6" fill={art.moods.celebration} />
      {/* legs + feet */}
      <g fill="url(#be-robotmetal)">
        <rect x="48" y="160" width="15" height="40" rx="7" />
        <rect x="77" y="160" width="15" height="40" rx="7" />
      </g>
      <rect x="42" y="198" width="26" height="10" rx="5" fill="#7c909d" />
      <rect x="72" y="198" width="26" height="10" rx="5" fill="#7c909d" />
      {/* arms — left down, right raising the ball to shoulder height */}
      <g stroke="url(#be-robotmetal)" strokeWidth="11" strokeLinecap="round" fill="none">
        <path d="M 40 96 Q 30 116 32 138" />
        <path d="M 100 96 Q 118 92 122 74" />
      </g>
      <circle cx="32" cy="142" r="7" fill="#c6d4dc" />
      {/* torso in the bowling shirt over the chassis; a hip block joins the
          legs to the body — nothing floats */}
      <rect x="36" y="64" width="68" height="72" rx="16" fill="url(#be-robotmetal)" />
      <rect x="44" y="126" width="52" height="40" rx="10" fill="#8fa2af" />
      <g transform="translate(70, 72)">
        <BowlingShirt w={64} base="#8fd8c6" panel={CREAM} />
      </g>
      <BowlingBall x={126} y={58} r={19} tint={ball} glow={starlight} />
      <circle cx="120" cy="72" r="7" fill="#c6d4dc" />
      {/* head + visor */}
      <rect x="38" y="26" width="64" height="50" rx="14" fill="url(#be-robotmetal)" />
      <rect x="46" y="38" width="48" height="26" rx="11" fill="#0a1a24" />
      <circle cx="62" cy="51" r="5.5" fill="#8fd8c6" style={{ filter: "drop-shadow(0 0 6px rgba(143,216,198,0.9))" }} />
      <circle cx="80" cy="51" r="5.5" fill="#8fd8c6" style={{ filter: "drop-shadow(0 0 6px rgba(143,216,198,0.9))" }} />
      <circle cx="38" cy="50" r="5" fill="#7c909d" />
      <circle cx="102" cy="50" r="5" fill="#7c909d" />
    </svg>
  );
}

function DevFigure({ starlight }: { starlight: boolean }) {
  const tint = bowlerBall("dev", starlight);
  const skin = "#e8b88a";
  return (
    <svg viewBox="-60 -60 120 190" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <ellipse cx="0" cy="118" rx="38" ry="7" fill="#00000055" />
      {/* legs — league slacks, rental shoes */}
      <rect x="-22" y="52" width="18" height="62" rx="8" fill="#1c2230" />
      <rect x="4" y="52" width="18" height="62" rx="8" fill="#1c2230" />
      <rect x="-26" y="108" width="26" height="10" rx="4" fill={SHOE} />
      <rect x="2" y="108" width="26" height="10" rx="4" fill={SHOE} />
      {/* the shirt from the back: tint body, contrast yoke, the lettering —
          a bowling shirt says who's up with no caption */}
      <path d="M -40 -2 C -40 -14 40 -14 40 -2 L 36 60 C 20 66 -20 66 -36 60 Z" fill={tint} stroke="#00000030" strokeWidth="1.5" />
      <path d="M -40 -2 C -40 -14 40 -14 40 -2 L 40 10 L -40 10 Z" fill={CREAM} opacity="0.85" />
      <text x="0" y="36" textAnchor="middle" fontFamily={art.mono} fontSize="12" fontWeight="800" letterSpacing="2" fill={CREAM}>
        DEV
      </text>
      {/* arms hanging ready, the ball in hand */}
      <path d="M -38 6 Q -52 36 -48 64" fill="none" stroke={skin} strokeWidth="9" strokeLinecap="round" />
      <path d="M 38 6 Q 54 36 50 64" fill="none" stroke={skin} strokeWidth="9" strokeLinecap="round" />
      <BowlingBall x={52} y={70} r={16} tint={tint} glow={starlight} />
      {/* head + hair, from behind */}
      <circle cx="0" cy="-26" r="19" fill={skin} />
      <path d="M -19 -30 C -20 -56 20 -56 19 -30 C 12 -44 -12 -44 -19 -30 Z" fill="#3a2a22" />
    </svg>
  );
}

/**
 * What a bowler has to show for themselves.
 *
 * Ported from the trophy the consuming deck keeps on its wall, which already
 * carried the metal distinction; the prop is renamed to say what it means
 * HERE. There it marked a single second place in a decade of firsts, and it
 * wore a "2nd" plate to say so — that is a story about that room, so it does
 * not come across. Here the metal is the whole message.
 */
export function Trophy({ metal }: { metal: "silver" | "gold" }) {
  const face = metal === "silver" ? "#b8bcc4" : "#e2b44a";
  const deep = metal === "silver" ? "#7f858f" : "#a87f2c";
  const plinth = metal === "silver" ? "#5c626b" : "#6e5638";
  return (
    <svg viewBox="-26 -40 52 56" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <path d="M -13 -34 L 13 -34 L 10 -12 C 8 -4 -8 -4 -10 -12 Z" fill={face} stroke={deep} strokeWidth="1.6" />
      <path d="M -13 -30 C -22 -30 -22 -16 -11 -14" fill="none" stroke={face} strokeWidth="3" />
      <path d="M 13 -30 C 22 -30 22 -16 11 -14" fill="none" stroke={face} strokeWidth="3" />
      <rect x="-4" y="-4" width="8" height="8" fill={deep} />
      <rect x="-12" y="4" width="24" height="7" rx="2" fill={plinth} />
    </svg>
  );
}

/**
 * The rookie's emblem — a house ball off the rack, in plain grey.
 *
 * Somebody with no metal yet still has something: the ball is what everybody
 * starts with. Grey rather than any bowler's colour, because this says what
 * LEVEL they are, and the level is not theirs personally.
 */
export function BallMark({ tint = "#8d95a3" }: { tint?: string }) {
  return (
    <svg viewBox="-25 -25 50 50" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <BowlingBall x={0} y={0} r={21} tint={tint} />
    </svg>
  );
}

/**
 * The selected bowler, drawn to fill their pane.
 *
 * FIGURE ONLY — the trophy is placed by whatever frames this, not drawn in
 * here. The three figures have three viewBoxes and three postures, so a
 * trophy positioned inside each would be three placement problems that drift
 * apart the moment any figure is redrawn; against the frame's own corner it
 * lands identically for all three.
 */
export function BowlerFigure({ kind, starlight = false }: { kind: BowlerKind; starlight?: boolean }) {
  if (kind === "alien") return <AlienFigure starlight={starlight} />;
  if (kind === "robot") return <RobotFigure starlight={starlight} />;
  return <DevFigure starlight={starlight} />;
}
