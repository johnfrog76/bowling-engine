import type { PinId } from "../engine";
import { FULL_RACK, isSplit } from "../engine";
import { art } from "./theme";

/**
 * The top-down ten-pin diagram — the coach's-eye view.
 *
 * Lit = standing, dark = down, straight from `standingAfter()`. This pane is
 * the reason the pin-identity layer exists at all: a count can never tell you
 * WHICH pins are standing, and a coach staring down a 7–10 gives different
 * advice than one looking at a 4–5. When the leave is a split (`isSplit`,
 * the engine's own geometry, not a list of famous names), the survivors glow —
 * the gap between them is the composition.
 */

// True top-down triangle: back row at the top, the classic scoresheet
// orientation. A pin from above is concentric circles: white body, the red
// neck-ring seen end-on, pale head.
const POS: Record<PinId, { x: number; y: number }> = {
  7: { x: -78, y: -54 },
  8: { x: -26, y: -54 },
  9: { x: 26, y: -54 },
  10: { x: 78, y: -54 },
  4: { x: -52, y: -12 },
  5: { x: 0, y: -12 },
  6: { x: 52, y: -12 },
  2: { x: -26, y: 30 },
  3: { x: 26, y: 30 },
  1: { x: 0, y: 72 },
};

export function Overhead({ standing, splitTone }: { standing: readonly PinId[]; splitTone?: string }) {
  const up = new Set<PinId>(standing);
  const split = isSplit(standing);
  const tone = splitTone ?? art.moods.suspense;
  return (
    <svg viewBox="-124 -100 248 224" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      {FULL_RACK.map((p) => {
        const c = POS[p];
        const lit = up.has(p);
        return (
          <g key={p} style={lit && split ? { filter: `drop-shadow(0 0 10px ${tone})` } : undefined}>
            {lit ? (
              <g>
                <circle cx={c.x} cy={c.y} r="17" fill={art.pin} stroke="#c9c0ab" strokeWidth="1.5" />
                <circle cx={c.x} cy={c.y} r="11" fill="none" stroke={art.pinStripe} strokeWidth="3.4" />
                <circle cx={c.x} cy={c.y} r="6.5" fill="#fdf8ee" />
                <text x={c.x} y={c.y + 3.6} textAnchor="middle" fontFamily={art.mono} fontSize="9.5" fontWeight="700" fill="#5a5244">
                  {p}
                </text>
              </g>
            ) : (
              <g>
                <circle cx={c.x} cy={c.y} r="17" fill="#1e1a33" stroke="#332d52" strokeWidth="2" />
                <text x={c.x} y={c.y + 4} textAnchor="middle" fontFamily={art.mono} fontSize="11" fill="#4f4877">
                  {p}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {split && (
        <text x="0" y="112" textAnchor="middle" fontFamily={art.mono} fontSize="15" fontWeight="700" letterSpacing="4" fill={tone}>
          SPLIT
        </text>
      )}
    </svg>
  );
}
