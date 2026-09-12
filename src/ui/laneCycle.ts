/**
 * The lane cycle — ONE timeline the ball, the pins and the machine obey.
 *
 * Ported with the art it drives: three coordination rules are held by
 * construction rather than by hand-typed percentages agreeing. (1) The ball
 * can only roll when the lane is clear — a roll starts at cycle start.
 * (2) Pins explode only on impact — the instant the roll ends. (3) Resets
 * happen only after impact plus a reasonable delay — the guard drops at the
 * end of `settle`, and between impact and the guard the felled pins LIE on
 * the deck as deadwood (an empty deck under a raised guard is a lie and
 * never renders). Every keyframe below is generated from these durations.
 *
 * Real league flight is ~2.4s; on screen that reads sluggish, so the roll is
 * tuned faster with purpose. The ratios are the shared canon.
 */
export const LANE_CYCLE = {
  roll: 1.6,
  impact: 0.55,
  settle: 1.1,
  sweep: 1.4,
  rerack: 0.9,
  clear: 0.65,
} as const;

export const LANE_CYCLE_S = Object.values(LANE_CYCLE).reduce((a, b) => a + b, 0);

const CYCLE_END = (() => {
  let t = 0;
  const m = {} as Record<keyof typeof LANE_CYCLE, number>;
  for (const k of Object.keys(LANE_CYCLE) as Array<keyof typeof LANE_CYCLE>) {
    t += LANE_CYCLE[k];
    m[k] = t;
  }
  return m;
})();

const pct = (t: number) => `${((t / LANE_CYCLE_S) * 100).toFixed(2)}%`;

const R = CYCLE_END.roll;
const I = CYCLE_END.impact;
const S = CYCLE_END.settle;
const W = CYCLE_END.sweep;
const K = CYCLE_END.rerack;

// The three ballistic exits: three kick points, then the DEADWOOD pose —
// where the pin lies on the deck until the rake takes it.
const KICKS = {
  a: [
    "translate(-16px, -14px) rotate(-70deg)",
    "translate(-36px, -20px) rotate(-210deg)",
    "translate(-46px, 4px) rotate(-320deg)",
    "translate(-38px, 10px) rotate(-455deg)",
  ],
  b: [
    "translate(18px, -16px) rotate(80deg)",
    "translate(40px, -18px) rotate(230deg)",
    "translate(50px, 6px) rotate(330deg)",
    "translate(42px, 12px) rotate(460deg)",
  ],
  c: [
    "translate(2px, -26px) rotate(-30deg)",
    "translate(-6px, -34px) rotate(150deg) scale(0.9)",
    "translate(4px, 4px) rotate(300deg) scale(0.85)",
    "translate(3px, 8px) rotate(448deg) scale(0.85)",
  ],
} as const;

// standing → kicked → tumbling → LYING as deadwood (visible through the
// settle delay) → gone the moment the rake passes. The `rearrive` variant
// then lowers back in with the fresh rack (a full reset); without it the
// pin stays down (a partial reset — that pin is gone until the next frame).
const pinflyFrames = (k: readonly string[], rearrive: boolean) =>
  `0%, ${pct(R)} { transform: none; opacity: 1; } ` +
  `${pct(R + 0.1)} { transform: ${k[0]}; opacity: 1; } ` +
  `${pct(R + 0.25)} { transform: ${k[1]}; opacity: 1; } ` +
  `${pct(R + 0.42)} { transform: ${k[2]}; opacity: 0.95; } ` +
  `${pct(I)}, ${pct(S + 0.3)} { transform: ${k[3]}; opacity: 0.9; } ` +
  (rearrive
    ? `${pct(S + 0.4)}, ${pct(W)} { transform: ${k[3]}; opacity: 0; } ` +
      `${pct(W + 0.05)} { transform: translateY(-14px); opacity: 0; } ` +
      `${pct(W + LANE_CYCLE.rerack * 0.5)} { transform: translateY(-10px); opacity: 0.85; } ` +
      `${pct(K)}, 100% { transform: none; opacity: 1; }`
    : `${pct(S + 0.4)}, 100% { transform: ${k[3]}; opacity: 0; }`);

/**
 * Every animation in the lane scene, generated from the one clock. All of
 * them play ONCE per roll with a linear timing function and a `both` fill —
 * never `steps(1, end)`, whose forwards fill holds the pre-jump value
 * forever on a finished animation (found the hard way, upstream).
 */
export const LANE_KEYFRAMES = `
  /* the thrown ball — REAL projection math (apparent size ∝ 1/distance):
     43% of the screen path in the first quarter of the flight; gone at
     impact. --tx lets a gutter ball drift into the channel on the way. */
  @keyframes be-throw {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    ${pct(R * 0.25)} { transform: translate(calc(var(--tx, 0px) * 0.43), calc(var(--ty, -170px) * 0.43)) scale(0.76); opacity: 1; }
    ${pct(R * 0.5)} { transform: translate(calc(var(--tx, 0px) * 0.69), calc(var(--ty, -170px) * 0.69)) scale(0.61); opacity: 1; }
    ${pct(R * 0.75)} { transform: translate(calc(var(--tx, 0px) * 0.87), calc(var(--ty, -170px) * 0.87)) scale(0.51); opacity: 1; }
    ${pct(R)} { transform: translate(var(--tx, 0px), var(--ty, -170px)) scale(0.44); opacity: 1; }
    ${pct(R + 0.05)}, 100% { transform: translate(var(--tx, 0px), var(--ty, -170px)) scale(0.44); opacity: 0; }
  }
  /* per-pin explosion — partial reset: the pin stays down */
  @keyframes be-pinfly-a { ${pinflyFrames(KICKS.a, false)} }
  @keyframes be-pinfly-b { ${pinflyFrames(KICKS.b, false)} }
  @keyframes be-pinfly-c { ${pinflyFrames(KICKS.c, false)} }
  /* per-pin explosion — full reset: raked, then back with the fresh set */
  @keyframes be-pinfull-a { ${pinflyFrames(KICKS.a, true)} }
  @keyframes be-pinfull-b { ${pinflyFrames(KICKS.b, true)} }
  @keyframes be-pinfull-c { ${pinflyFrames(KICKS.c, true)} }
  /* the leave, on a partial reset: lifted clear when the guard drops,
     held through the rake, lowered home during rerack */
  @keyframes be-pinlift {
    0%, ${pct(S)} { transform: none; opacity: 1; }
    ${pct(S + 0.35)}, ${pct(W)} { transform: translateY(-34px); opacity: 0.45; }
    ${pct(W + LANE_CYCLE.rerack * 0.6)} { transform: translateY(-6px); opacity: 0.9; }
    ${pct(K)}, 100% { transform: none; opacity: 1; }
  }
  /* a still-standing pin at the END of a frame: nothing lifts it — the
     sweep clears it with the deadwood, and a fresh one arrives in its place */
  @keyframes be-pinsweep {
    0%, ${pct(S + 0.3)} { transform: none; opacity: 1; }
    ${pct(S + 0.45)}, ${pct(W)} { transform: none; opacity: 0; }
    ${pct(W + 0.05)} { transform: translateY(-14px); opacity: 0; }
    ${pct(W + LANE_CYCLE.rerack * 0.5)} { transform: translateY(-10px); opacity: 0.85; }
    ${pct(K)}, 100% { transform: none; opacity: 1; }
  }
  /* a pin felled EARLIER in the frame, returning with the fresh rack */
  @keyframes be-pinarrive {
    0%, ${pct(W)} { transform: translateY(-14px); opacity: 0; }
    ${pct(W + LANE_CYCLE.rerack * 0.5)} { transform: translateY(-10px); opacity: 0.85; }
    ${pct(K)}, 100% { transform: none; opacity: 1; }
  }
  /* the sweep GATE: down only after impact + settle, rakes, returns
     before the fresh set is placed; --gd is the opening's travel */
  @keyframes be-gate {
    0%, ${pct(S)} { transform: translateY(0); }
    ${pct(S + 0.25)}, ${pct(S + LANE_CYCLE.sweep * 0.75)} { transform: translateY(var(--gd, 90px)); }
    ${pct(S + LANE_CYCLE.sweep * 0.8)}, ${pct(W)} { transform: translateY(calc(var(--gd, 90px) * 0.45)); }
    ${pct(W + 0.25)}, 100% { transform: translateY(0); }
  }
`;
