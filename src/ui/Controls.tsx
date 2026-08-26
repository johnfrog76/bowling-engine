import type { ReactElement } from "react";
import { Button, Switch } from "@fluentui/react-components";
import { AddRegular, SubtractRegular } from "@fluentui/react-icons";
import { art } from "./theme";
import { BOWLER_KINDS, bowlerLabel } from "./roster";
import { SKILL_LEVELS, skillLabel, skillTrophy, type SkillLevel } from "./skill";
import { Trophy } from "./Bowlers";
import { MAX_BOWLERS, MIN_BOWLERS, TOGGLES, type PlayerConfig, type Settings } from "./settings";

/**
 * Every knob the room has, in a drawer.
 *
 * WHY A DRAWER AND NOT A BAR. The control bar this replaced held five knobs
 * and was already wrapping; a sixth would have cost the lane a row of pixels.
 * A drawer has no such ceiling — which matters because the knobs are not a
 * fixed set. They grow. So this file is arranged as a SYSTEM rather than a
 * layout: adding a setting is one entry in `TOGGLES` and one field on
 * `Settings`, and it appears, labelled, in the right group, at a real touch
 * size, on both layouts. Nothing has to be re-laid-out to make room.
 *
 * THE GROUPING IS THE OTHER HALF. Knobs divide into two kinds and they were
 * previously mixed in one row: things that belong to A BOWLER (who they are,
 * how well they throw) and things that belong to THE ROOM (the lighting, the
 * clock). Per-bowler controls are therefore a real `<fieldset>` with a
 * `<legend>` — which is not decoration: it is what lets a screen reader
 * announce "Bowler 2, skill, League" instead of an anonymous "League", and it
 * is what makes "add another bowler" a repeat of a unit rather than a
 * redesign of a row.
 */

// ── Small parts ─────────────────────────────────────────────────────────────

const groupLabel: React.CSSProperties = {
  fontFamily: art.mono,
  fontSize: "0.72rem",
  letterSpacing: "0.2em",
  color: art.muted,
  marginBottom: "0.6rem",
};

/**
 * What a level looks like: the ball you always have, plus whatever metal the
 * level has earned. Drawn at picker size from the same two components the
 * lane uses, so there is one source for "League is silver".
 */
function SkillMark({ skill }: { skill: SkillLevel }) {
  const metal = skillTrophy(skill);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, height: 20 }} aria-hidden="true">
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: art.accent, opacity: 0.85 }} />
      {metal && (
        <span style={{ width: 16, height: 20 }}>
          <Trophy metal={metal} />
        </span>
      )}
    </span>
  );
}

/**
 * A row of exclusive options. Ported in spirit from juggling-engine's own
 * `Segmented` so the two repos' drawers read the same — and kept at a 44px
 * minimum so it is a real target on a phone rather than a desktop control
 * that happens to be tappable.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  format,
  adorn,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  format: (v: T) => string;
  /** Optional graphic shown beside each option's name. */
  adorn?: (v: T) => ReactElement;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} role="group" aria-label={label}>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={on}
            style={{
              fontFamily: art.mono,
              fontSize: "0.85rem",
              padding: "0.4rem 0.85rem",
              minHeight: 44,
              cursor: "pointer",
              borderRadius: 4,
              border: `1px solid ${on ? art.accent : art.border}`,
              background: on ? art.accent : "transparent",
              color: on ? art.bg : art.muted,
              fontWeight: on ? 700 : 400,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {adorn?.(o)}
              {format(o)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * One bowler, as a fieldset.
 *
 * The unit that repeats. A second bowler is a second one of these, which is
 * why adding a bowler needs no layout decision — the shape was already a
 * repeatable block rather than a row in a bar.
 */
function PlayerFieldset({
  index,
  player,
  onChange,
}: {
  index: number;
  player: PlayerConfig;
  onChange: (next: PlayerConfig) => void;
}) {
  const name = `Bowler ${index + 1}`;
  return (
    <fieldset
      style={{
        border: `1px solid ${art.border}`,
        borderRadius: 8,
        padding: "0.5rem 0.9rem 0.9rem",
        margin: 0,
        minWidth: 0,
      }}
    >
      <legend
        style={{
          fontFamily: art.mono,
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          color: art.accent,
          padding: "0 0.4rem",
        }}
      >
        {name.toUpperCase()} · {bowlerLabel(player.kind).toUpperCase()}
      </legend>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <div>
          <div style={groupLabel}>WHO</div>
          <Segmented
            label={`${name} character`}
            options={BOWLER_KINDS}
            value={player.kind}
            onChange={(kind) => onChange({ ...player, kind })}
            format={bowlerLabel}
          />
        </div>
        <div>
          <div style={groupLabel}>SKILL</div>
          {/* The picker shows the same thing the bowler is holding — ball,
              silver, gold — so choosing a level and reading the lane are the
              same vocabulary rather than two that have to be matched up. */}
          <Segmented
            label={`${name} skill`}
            options={SKILL_LEVELS}
            value={player.skill}
            onChange={(skill) => onChange({ ...player, skill })}
            format={skillLabel}
            adorn={(lvl) => <SkillMark skill={lvl} />}
          />
        </div>
      </div>
    </fieldset>
  );
}

/**
 * How many bowlers, as a stepper.
 *
 * A +/− pair rather than an "add" button and a "remove" on every card: the
 * count is ONE fact, so it gets one control, and the fieldsets below are its
 * consequence rather than a list you maintain by hand.
 */
function CountStepper({
  count,
  onChange,
}: {
  count: number;
  onChange: (n: number) => void;
}) {
  const step = (d: number) => onChange(Math.min(MAX_BOWLERS, Math.max(MIN_BOWLERS, count + d)));
  const btn = (label: string, icon: ReactElement, d: number, disabled: boolean) => (
    <Button
      appearance="secondary"
      icon={icon}
      aria-label={label}
      disabled={disabled}
      onClick={() => step(d)}
      style={{ minWidth: 44, minHeight: 44 }}
    />
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {btn("One fewer bowler", <SubtractRegular />, -1, count <= MIN_BOWLERS)}
      <span
        aria-live="polite"
        style={{
          fontFamily: art.mono,
          fontSize: "1.1rem",
          fontWeight: 700,
          color: art.text,
          minWidth: "2ch",
          textAlign: "center",
        }}
      >
        {count}
      </span>
      {btn("One more bowler", <AddRegular />, 1, count >= MAX_BOWLERS)}
      <span style={{ fontFamily: art.mono, fontSize: "0.72rem", letterSpacing: "0.16em", color: art.muted }}>
        {count === 1 ? "BOWLER" : "BOWLERS"}
      </span>
    </div>
  );
}

// ── The drawer's body ───────────────────────────────────────────────────────

/**
 * The drawer holds SETTINGS, not actions.
 *
 * Roll and New game used to live down here and it was a trap: shut the drawer
 * with auto roll off and there was no way to throw a ball. They are the two
 * things somebody actually DOES, so they belong on the stage where they cannot
 * be hidden — a setting can wait behind a gear; the primary verb cannot.
 */
export function Controls({
  players,
  settings,
  onPlayersChange,
  onSettingsChange,
}: {
  players: readonly PlayerConfig[];
  settings: Settings;
  onPlayersChange: (next: PlayerConfig[]) => void;
  onSettingsChange: (next: Settings) => void;
}) {
  const setPlayer = (i: number, next: PlayerConfig) =>
    onPlayersChange(players.map((p, j) => (j === i ? next : p)));

  const setCount = (n: number) => {
    if (n < players.length) return onPlayersChange(players.slice(0, n));
    // Each arrival defaults to a character nobody is using yet, so the lanes
    // do not fill up with identical figures.
    const next = [...players];
    while (next.length < n) {
      const taken = new Set(next.map((p) => p.kind));
      const kind = BOWLER_KINDS.find((k) => !taken.has(k)) ?? BOWLER_KINDS[next.length % BOWLER_KINDS.length];
      next.push({ kind, skill: "league" });
    }
    onPlayersChange(next);
  };

  return (
    <>
      {/* ── who is bowling ────────────────────────────────────────────── */}
      <div>
        <div style={groupLabel}>BOWLERS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          <CountStepper count={players.length} onChange={setCount} />
          {players.map((p, i) => (
            <PlayerFieldset key={i} index={i} player={p} onChange={(next) => setPlayer(i, next)} />
          ))}
        </div>
      </div>

      {/* ── the room ──────────────────────────────────────────────────── */}
      <div>
        <div style={groupLabel}>THE ROOM</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {TOGGLES.map((t) => (
            <div key={t.key}>
              <Switch
                checked={settings[t.key]}
                onChange={(_, d) => onSettingsChange({ ...settings, [t.key]: d.checked })}
                label={<span style={{ fontFamily: art.mono, fontSize: "0.85rem", color: art.text }}>{t.label}</span>}
              />
              <div style={{ fontSize: "0.72rem", color: art.muted, opacity: 0.8, marginLeft: "2.9rem", marginTop: "-0.2rem" }}>
                {t.hint}
              </div>
            </div>
          ))}
        </div>
      </div>

    </>
  );
}
