import { art } from "./theme";

/**
 * The stands — a thin ambient strip. The crowd idles on its own slow clock
 * and is never mood-slaved: ambient atoms that track the game read as
 * animatronics, and a room that only exists to react reads as wallpaper.
 * They sway because the room is alive, not because anything happened.
 */

const CROWD_KEYFRAMES = `
  @keyframes be-sway { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes be-twinkle { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }
`;

const SHIRTS = ["#4f9de9", "#e8a13a", "#8fd8c6", "#c0463f", "#a78bfa", "#e8ecef", "#79d68a"];
const SKINS = ["#e8b88a", "#c68863", "#f2c9a0", "#8d5a3b"];

function Bust({ x, y, s = 1, shirt, skin, hairUp = false }: { x: number; y: number; s?: number; shirt: string; skin: string; hairUp?: boolean }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      {/* shoulders */}
      <path d="M -26 30 C -26 6 26 6 26 30 L 26 36 L -26 36 Z" fill={shirt} />
      {/* head */}
      <circle cx="0" cy="-4" r="14" fill={skin} />
      {hairUp ? (
        <g fill="#241a12">
          <path d="M -14 -8 A 14 14 0 0 1 14 -8 L 14 -2 A 14 14 0 0 0 -14 -2 Z" />
          <circle cx="0" cy="-18" r="6" />
        </g>
      ) : (
        <path d="M -14 -8 A 14 14 0 0 1 14 -8 L 14 -4 A 14 14 0 0 0 -14 -4 Z" fill="#1c1611" />
      )}
    </g>
  );
}

/** The internet's cat, asleep on the rail. Never pointed at, never named. */
function SleepingCat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const tone = "#b58ea8";
  const outline = "#3a2a36";
  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`}>
      <path d="M 28 8 Q 48 8 46 -8 Q 44 -18 34 -14" stroke={tone} strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="6" rx="34" ry="15" fill={tone} stroke={outline} strokeWidth="1.6" />
      <ellipse cx="-14" cy="18" rx="8" ry="4" fill={tone} stroke={outline} strokeWidth="1.2" />
      <ellipse cx="2" cy="19" rx="8" ry="4" fill={tone} stroke={outline} strokeWidth="1.2" />
      <circle cx="-26" cy="-4" r="13" fill={tone} stroke={outline} strokeWidth="1.6" />
      <path d="M -39 -9 L -35 -21 L -29 -12 Z" fill={tone} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M -23 -12 L -17 -21 L -13 -9 Z" fill={tone} stroke={outline} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M -33 -4 Q -31 -2 -29 -4" stroke={outline} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M -25 -4 Q -23 -2 -21 -4" stroke={outline} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M -27.5 1 L -26 2.5 L -24.5 1 Z" fill={outline} />
      <text x="-6" y="-18" fontFamily={art.mono} fontSize="13" fill={art.muted} opacity="0.8">
        z z
      </text>
    </g>
  );
}

export function Crowd({ uv = false }: { uv?: boolean }) {
  const lightA = uv ? art.uvMagenta : "#e8a13a";
  const lightB = uv ? art.uvCyan : "#8fd8c6";
  return (
    <svg viewBox="0 0 900 140" preserveAspectRatio="xMidYMid slice" style={{ display: "block", width: "100%", height: "100%" }}>
      <style>{CROWD_KEYFRAMES}</style>
      <rect x="0" y="0" width="900" height="140" fill={uv ? art.uvRoom : art.room} />
      {/* string lights along the back wall */}
      <path d="M 0 26 Q 225 46 450 26 Q 675 6 900 26" fill="none" stroke="#3a3358" strokeWidth="2" />
      {Array.from({ length: 15 }).map((_, i) => {
        const t = (i + 0.5) / 15;
        const x = t * 900;
        // approximately the wire's sag: down in the first half, up in the second
        const y = 26 + 10 * Math.sin(t * Math.PI * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y + 6}
            r="4"
            fill={i % 2 === 0 ? lightA : lightB}
            style={{ animation: `be-twinkle ${3 + (i % 5) * 0.7}s ease-in-out ${-i * 0.9}s infinite`, filter: `drop-shadow(0 0 4px ${i % 2 === 0 ? lightA : lightB})` }}
          />
        );
      })}
      {/* bleacher rows */}
      <rect x="0" y="64" width="900" height="30" fill={uv ? "#191c48" : "#232a44"} />
      <rect x="0" y="104" width="900" height="36" fill={uv ? "#12143a" : "#1a2036"} />
      {/* back row — its own slow clock */}
      <g style={{ animation: "be-sway 4.4s ease-in-out infinite", transformOrigin: "50% 100%" }}>
        {[70, 190, 310, 545, 665, 790].map((x, i) => (
          <Bust key={x} x={x} y={44} s={0.9} shirt={SHIRTS[i % SHIRTS.length]} skin={SKINS[i % SKINS.length]} hairUp={i % 3 === 1} />
        ))}
        <SleepingCat x={438} y={48} s={0.62} />
      </g>
      {/* front row — offset clock, never in sync with the back */}
      <g style={{ animation: "be-sway 5.2s ease-in-out -2.1s infinite", transformOrigin: "50% 100%" }}>
        {[130, 255, 380, 500, 620, 745, 855].map((x, i) => (
          <Bust key={x} x={x} y={92} s={1.05} shirt={SHIRTS[(i + 3) % SHIRTS.length]} skin={SKINS[(i + 2) % SKINS.length]} hairUp={i % 4 === 2} />
        ))}
      </g>
    </svg>
  );
}
