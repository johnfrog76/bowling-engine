import { useEffect, useRef, useState } from "react";
import { makeStyles } from "@fluentui/react-components";
import type { Mood } from "../engine";
import { art } from "./theme";

/**
 * The coach — a bowling ball that took the job personally.
 *
 * His skin is a direct render of the engine's mood classification
 * (`classifyMood`), never an aesthetic choice: mint at rest, chalk when
 * teaching, cherry — swirled, never flat — on a gutter, amber on a strike,
 * violet while a fill ball hangs. The swirl is rage-only and animated.
 *
 * He reacts to mood TRANSITIONS and then goes quiet — a coach, not a
 * play-by-play announcer. One line per state, and silence between events.
 */

const SWIRL_KEYFRAMES = `
  @keyframes be-swirl { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes be-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.015); } }
`;

export function Coach({ mood = "idle", width }: { mood?: Mood; width?: number | string }) {
  const tone = art.moods[mood];
  const raging = mood === "rage";
  const uid = `coach-${mood}`;
  const w = typeof width === "number" ? `${width}px` : (width ?? "100%");
  return (
    <svg viewBox="-135 -145 270 295" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: w }}>
      <style>{SWIRL_KEYFRAMES}</style>
      <defs>
        <radialGradient id={`${uid}-skin`} cx="0.38" cy="0.32" r="0.95">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.28" stopColor={tone} />
          <stop offset="1" stopColor={raging ? "#8e1f1c" : "#00000055"} />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx="0" cy="0" r="86" />
        </clipPath>
      </defs>
      {/* ground shadow */}
      <ellipse cx="0" cy="132" rx="86" ry="15" fill="#00000033" />
      {/* legs + two-tone rental shoes */}
      <g stroke="#2b3238" strokeWidth="13" strokeLinecap="round" fill="none">
        <path d="M -26 74 L -28 118" />
        <path d="M 26 74 L 30 118" />
      </g>
      <g>
        <path d="M -46 118 Q -46 130 -30 130 L -6 130 Q -2 122 -10 116 L -34 112 Q -44 112 -46 118 Z" fill="#c0463f" />
        <path d="M -46 122 L -4 126" stroke="#f2e8d2" strokeWidth="4" />
        <path d="M 10 118 Q 8 130 24 130 L 50 130 Q 54 122 46 116 L 22 112 Q 12 112 10 118 Z" fill="#c0463f" />
        <path d="M 10 122 L 52 126" stroke="#f2e8d2" strokeWidth="4" />
      </g>
      {/* arms */}
      <g stroke={tone} strokeWidth="11" strokeLinecap="round" fill="none">
        <path d="M -74 26 Q -96 52 -92 84" />
        <path d="M 74 26 Q 96 52 92 84" />
      </g>
      <circle cx="-93" cy="86" r="10" fill="#f2e8d2" />
      <circle cx="93" cy="86" r="10" fill="#f2e8d2" />
      {/* THE BALL BODY — chameleon skin renders the engine's mood. Opaque:
          a dark disc under the skin so the gradient's translucent rim never
          lets a busy backdrop through him. */}
      <g style={{ animation: "be-breathe 3.2s ease-in-out infinite" }}>
        <circle cx="0" cy="0" r="86" fill="#12181c" />
        <circle cx="0" cy="0" r="86" fill={`url(#${uid}-skin)`} stroke={raging ? "#8e1f1c" : "#00000040"} strokeWidth="3" />
        {/* rage-only: the swirl — animated sweep, never a flat color swap */}
        {raging && (
          <g clipPath={`url(#${uid}-clip)`}>
            <g style={{ animation: "be-swirl 1.6s linear infinite", transformOrigin: "0px 0px" }}>
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d="M 0 0 C 40 -14 74 8 84 44 C 60 30 34 32 0 0 Z"
                  fill={i % 2 === 0 ? "#8e1f1c" : "#ff7a5c"}
                  opacity="0.55"
                  transform={`rotate(${i * 90})`}
                />
              ))}
            </g>
          </g>
        )}
        {/* finger holes — texture, upper right, never the eyes */}
        <g fill="#1a2025" opacity="0.9">
          <circle cx="38" cy="-34" r="8.4" />
          <circle cx="54" cy="-18" r="7.6" />
          <circle cx="52" cy="-40" r="6.8" />
        </g>
        {/* face */}
        <g>
          {raging && (
            <g stroke="#3a1210" strokeWidth="6" strokeLinecap="round">
              <path d="M -44 -34 L -16 -24" />
              <path d="M -36 -24 L -8 -34" />
            </g>
          )}
          <ellipse cx="-26" cy="-14" rx="12" ry={raging ? 10 : 15} fill="#ffffff" />
          <ellipse cx="4" cy="-14" rx="12" ry={raging ? 10 : 15} fill="#ffffff" />
          <circle cx="-23" cy="-11" r="5" fill="#1a2025" />
          <circle cx="7" cy="-11" r="5" fill="#1a2025" />
          {raging ? (
            <path d="M -30 26 Q -10 14 12 26" fill="none" stroke="#3a1210" strokeWidth="5.5" strokeLinecap="round" />
          ) : (
            <path d="M -30 18 Q -10 32 12 18" fill="none" stroke="#33291f" strokeWidth="5.5" strokeLinecap="round" />
          )}
        </g>
      </g>
      {/* the baseball cap — a bowling ball had a kid with a baseball cap */}
      <g transform="translate(-8, -74) rotate(-6)">
        <path d="M -44 0 C -44 -34 44 -34 44 0 Z" fill="#c0463f" stroke="#7c2f2b" strokeWidth="3" />
        <path d="M 30 -4 Q 74 -10 84 4 Q 56 8 30 4 Z" fill="#c0463f" stroke="#7c2f2b" strokeWidth="3" />
        <circle cx="0" cy="-26" r="5" fill="#7c2f2b" />
      </g>
    </svg>
  );
}

// One line per mood state, domain-neutral. `idle` is silence on purpose.
const LINES: Partial<Record<Mood, string>> = {
  coaching: "Count what you NEED, not what you see — bonuses are the currency.",
  rage: "That one found the channel. We do not talk about the channel.",
  celebration: "All ten. This frame now owes you the next two rolls.",
  suspense: "Fill ball pending. The 10th breaks its own rules on purpose.",
};

const QUIET_AFTER_MS = 5000;

const useStyles = makeStyles({
  panel: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    height: "100%",
    padding: "8px 14px",
    boxSizing: "border-box",
  },
  figure: { width: "76px", flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "center" },
  line: {
    flex: 1,
    minWidth: 0,
    fontFamily: art.hand,
    fontSize: "1rem",
    fontWeight: 600,
    "@media (max-width: 640px)": { fontSize: "1.05rem" },
    lineHeight: 1.45,
    color: art.text,
  },
  quiet: { color: art.muted, fontFamily: art.mono, fontSize: "0.8rem", letterSpacing: "0.1em" },
});

export function CoachPanel({ mood }: { mood: Mood }) {
  const s = useStyles();
  const [line, setLine] = useState<string | null>(null);
  const prev = useRef<Mood>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // React to TRANSITIONS only — a repeated mood is not a new event, and
  // between events the coach is quiet rather than narrating every frame.
  useEffect(() => {
    if (mood === prev.current) return;
    prev.current = mood;
    if (timer.current !== undefined) clearTimeout(timer.current);
    const next = LINES[mood] ?? null;
    setLine(next);
    if (next) timer.current = setTimeout(() => setLine(null), QUIET_AFTER_MS);
    return () => {
      if (timer.current !== undefined) clearTimeout(timer.current);
    };
  }, [mood]);

  return (
    <div className={s.panel}>
      <div className={s.figure}>
        <Coach mood={mood} />
      </div>
      {line ? <div className={s.line}>{line}</div> : <div className={s.quiet}>· · ·</div>}
    </div>
  );
}
