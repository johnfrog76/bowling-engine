import type { Game } from "../engine";
import { scoreFrame } from "../engine";
import { art } from "./theme";

/**
 * The wax-pencil scoresheet — scoring as a period object.
 *
 * Renders the REAL game: roll marks and cumulative totals straight from
 * `scoreFrame()`. An unresolved frame's total is wet — blur, wobble, a "?"
 * where the number will go — because the number genuinely is not knowable
 * yet. `resolved` IS the wet/set boundary; nothing here re-derives a rule.
 * When the lookback lands, the mark sets. That is the whole engine, visible.
 */

const WET_KEYFRAMES = `
  @keyframes be-wet { 0%, 100% { filter: blur(1.1px); opacity: 0.72; } 50% { filter: blur(1.5px); opacity: 0.62; } }
`;

function rollMark(game: Game, fi: number, ri: number): string {
  const f = game.frames[fi];
  if (!f || f.rolls[ri] === undefined) return "";
  const r = f.rolls[ri];
  if (r === 10) return "X";
  if (ri > 0 && f.rolls[ri - 1] !== 10 && f.rolls[ri - 1] + r === 10) return "/";
  if (r === 0) return "—";
  return String(r);
}

const BOX_W = 86;
const TENTH_W = BOX_W * 1.5; // period-accurate: scorers sized it up for the fill digit
const TOTAL_W = BOX_W * 9 + TENTH_W + 40;

export function Scoreboard({
  game,
  playerName = "AUTOBOWL",
  compact = false,
}: {
  game: Game;
  playerName?: string;
  /**
   * PHONE LEGIBILITY BEATS PERIOD CHARM.
   *
   * The marks are written in a script face, which is right — a scorer wrote
   * these by hand. But the sheet is 1000 units wide and a phone renders it a
   * few hundred pixels across, and a light cursive at that scale is not
   * "atmospheric", it is unreadable: the thing this page exists to show you
   * becomes the thing you cannot see.
   *
   * So on a small screen the marks step into the mono face and gain weight,
   * and the box rules lose their fade. Everything that makes it a scoresheet
   * — the acetate, the wax colour, the lamp pool, the wet unresolved frame —
   * is untouched. Only the handwriting steps aside, and only where it has to.
   */
  compact?: boolean;
}) {
  let running = 0;
  const markFont = compact ? art.mono : art.hand;
  const ruleOpacity = compact ? 0.8 : 0.55;
  const cellOpacity = compact ? 0.7 : 0.45;
  const markSize = compact ? 30 : 24;
  const totalSize = compact ? 40 : 34;
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }}>
      <style>{WET_KEYFRAMES}</style>
      <g transform={`translate(${(1000 - TOTAL_W) / 2 + 20}, 62) rotate(-1.1)`}>
        {/* hot lamp pool behind the acetate */}
        <ellipse cx={TOTAL_W / 2 - 20} cy="40" rx={TOTAL_W * 0.62} ry="120" fill={art.lampGlow} opacity="0.13" />
        {/* the acetate */}
        <rect x="-20" y="-46" width={TOTAL_W} height="172" rx="6" fill={art.acetate} opacity="0.95" />
        <rect x="-20" y="-46" width={TOTAL_W} height="172" rx="6" fill="none" stroke="#c9b98c" strokeWidth="2.5" />
        <text x="2" y="-27" fontFamily={markFont} fontSize={compact ? 26 : 22} fontWeight={compact ? 700 : undefined} fill={art.wax} opacity="0.9">
          {playerName}
        </text>
        {Array.from({ length: 10 }).map((_, fi) => {
          const w = fi === 9 ? TENTH_W : BOX_W;
          const bx = fi * BOX_W;
          const score = scoreFrame(game, fi);
          const marked = game.frames[fi] !== undefined;
          if (marked && score.resolved && score.value !== null) running += score.value;
          const wet = marked && !score.resolved;
          const rolls = fi === 9 ? [0, 1, 2] : [0, 1];
          return (
            <g key={fi} transform={`translate(${bx}, 0)`}>
              <rect x="0" y="0" width={w} height="112" fill="none" stroke={art.wax} strokeWidth="2" opacity={ruleOpacity} />
              <text x={w / 2} y="-3" textAnchor="middle" fontFamily={art.mono} fontSize="18" fontWeight="700" fill={art.wax} opacity="0.8">
                {fi + 1}
              </text>
              {rolls.map((ri) => {
                const cw = w / (fi === 9 ? 3 : 2);
                return (
                  <g key={ri}>
                    <rect
                      x={ri * cw}
                      y="0"
                      width={cw}
                      height="34"
                      fill="none"
                      stroke={art.wax}
                      strokeWidth={compact ? 1.8 : 1.4}
                      opacity={cellOpacity}
                      strokeDasharray={fi === 9 && ri === 2 ? "5 4" : undefined}
                    />
                    {marked && (
                      <text
                        x={ri * cw + cw / 2}
                        y="26"
                        textAnchor="middle"
                        fontFamily={markFont}
                        fontSize={markSize}
                        fontWeight="700"
                        fill={art.wax}
                        style={wet ? { animation: "be-wet 2.2s ease-in-out infinite" } : undefined}
                      >
                        {rollMark(game, fi, ri)}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* the cumulative total — the number that keeps rewriting the past */}
              {marked &&
                (score.resolved ? (
                  <text x={w / 2} y="88" textAnchor="middle" fontFamily={markFont} fontSize={totalSize} fontWeight="700" fill={art.wax}>
                    {running}
                  </text>
                ) : (
                  <text
                    x={w / 2}
                    y="88"
                    textAnchor="middle"
                    fontFamily={markFont}
                    fontSize={compact ? 34 : 30}
                    fontWeight={compact ? 700 : undefined}
                    fill={art.wax}
                    style={{ animation: "be-wet 2.2s ease-in-out infinite" }}
                  >
                    ?
                  </text>
                ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
