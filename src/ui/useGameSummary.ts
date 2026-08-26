import { useMemo } from "react";
import { isMatchOver, type Game, type Match } from "../engine";
import { bowlerChrome, bowlerLabel } from "./roster";
import { skillTrophy, type SkillLevel, type TrophyMetal } from "./skill";
import { PANEL_STATS, compareStat, summarise, type GameSummary, type Stat, type StatKey } from "./summary";
import type { PlayerConfig } from "./settings";

// ── The summary, packaged ───────────────────────────────────────────────────
//
// `summary.ts` answers questions about a game. This turns those answers into
// the thing a panel renders: rows with names and colours on them, stats already
// formatted, a leader resolved to a bowler, a winner.
//
// THE SPLIT IS THE POINT, and it is the same one the whole repo keeps. The
// module below knows about pins and frames and nothing else — no React, no
// colours, no units, no words. The hook knows about bowlers and how to print a
// number, and knows nothing about how a mark's bonus is worked out. Either can
// be rewritten without opening the other.
//
// A PANEL BUILT ON THIS SHOULD HAVE NO ARITHMETIC IN IT AT ALL. If a component
// ever needs to divide, compare or round something, that belongs here or one
// file over — a stat computed in a render is a stat that quietly disagrees with
// the same stat computed somewhere else.

/** How each stat prints, and what it is called out loud. */
const STAT_META: Record<StatKey, { label: string; unit: "pins" | "percent" | "points"; decimals: number }> = {
  firstBallAvg: { label: "First-Ball Pinfall Avg", unit: "pins", decimals: 1 },
  cleanFramePct: { label: "Clean Frame %", unit: "percent", decimals: 0 },
  markEfficiencyPct: { label: "Mark Efficiency %", unit: "percent", decimals: 0 },
  openFrameCost: { label: "Total Open Frame Cost", unit: "points", decimals: 0 },
  tenthClutchPct: { label: "Tenth Frame Clutch %", unit: "percent", decimals: 0 },
};

/**
 * A stat with no answer prints as an em dash, never as zero.
 *
 * The distinction is carried all the way from `summary.ts` to the screen on
 * purpose: a bowler who threw no marks has no mark efficiency, and printing
 * "0%" would state a verdict on a question that was never asked.
 */
export const NO_ANSWER = "—";

function formatStat(value: Stat, key: StatKey): string {
  if (value === null) return NO_ANSWER;
  const { unit, decimals } = STAT_META[key];
  const n = value.toFixed(decimals);
  if (unit === "percent") return `${n}%`;
  if (unit === "pins") return `${n} pins`;
  return `−${n} points`; // open-frame cost is a cost: shown as what it took away
}

/** One bowler's side of the panel. */
export interface SummaryRow {
  index: number;
  name: string;
  /** the bowler's own colour — the one the page already uses everywhere */
  chrome: string;
  skill: SkillLevel;
  /** the LEVEL trophy: ball / silver / gold, and never a function of who won */
  metal: TrophyMetal | null;
  game: Game;
  total: number;
  summary: GameSummary;
}

/** One row of the stats grid, ready to print. */
export interface SummaryStat {
  key: StatKey;
  label: string;
  /** per bowler, in roster order */
  values: Stat[];
  display: string[];
  /** the small line under the value — slot 3 carries the strike/spare shape */
  detail: (string | null)[];
  /** roster index of whoever leads, or null for a tie or an unanswerable stat */
  leader: number | null;
  margin: Stat;
}

export interface GameSummaryView {
  rows: SummaryRow[];
  stats: SummaryStat[];
  /**
   * Roster index of the highest score, or null when nobody is ahead — which
   * covers both a genuine tie and a solo game, where there is no one to be
   * ahead OF. A solo game still has a row, a score and three stats; what it
   * does not have is an opponent, and the panel should not invent one.
   */
  winner: number | null;
  /** Whether the panel has anything to be a summary OF. */
  over: boolean;
}

/**
 * Read a match back for the end-of-game panel.
 *
 * PURE, AND EXPORTED SEPARATELY FROM THE HOOK for the same reason the engine
 * keeps its own React down to one adapter: everything worth testing here is a
 * function of (match, players), and a test should not have to mount a component
 * to check that a tie is reported as a tie.
 *
 * Works on a match still in progress — `summarise` averages over the frames
 * actually thrown — so a caller can show a running read of the same numbers
 * without a second code path. `over` says whether the game has finished; when
 * to put the panel up is the page's decision, not this function's.
 */
export function buildSummaryView(match: Match, players: readonly PlayerConfig[]): GameSummaryView {
  const rows: SummaryRow[] = match.games.map((game, index) => {
    // A roster and a match can be a render apart mid-change; fall back rather
    // than indexing off the end of one of them.
    const player = players[index] ?? players[players.length - 1];
    const summary = summarise(game);
    return {
      index,
      name: bowlerLabel(player.kind).toUpperCase(),
      chrome: bowlerChrome(player.kind),
      skill: player.skill,
      metal: skillTrophy(player.skill),
      game,
      total: summary.total,
      summary,
    };
  });

  const stats: SummaryStat[] = PANEL_STATS.map((key) => {
    const summaries = rows.map((r) => r.summary);
    const { values, leader, margin } = compareStat(summaries, key);
    return {
      key,
      label: STAT_META[key].label,
      values,
      display: values.map((v) => formatStat(v, key)),
      // Only conversion earns a subtitle, and it earns it because "75%" begs
      // the question "out of what?" — the strike/spare shape is the answer.
      detail: rows.map((r) =>
        key === "markEfficiencyPct" ? `${r.summary.strikes} strikes / ${r.summary.spares} spares` : null,
      ),
      leader,
      margin,
    };
  });

  const best = Math.max(...rows.map((r) => r.total));
  const leaders = rows.filter((r) => r.total === best);

  return {
    rows,
    stats,
    winner: rows.length > 1 && leaders.length === 1 ? leaders[0].index : null,
    over: isMatchOver(match),
  };
}

/** The same view, memoised — the only React in either file. */
export function useGameSummary(match: Match, players: readonly PlayerConfig[]): GameSummaryView {
  return useMemo(() => buildSummaryView(match, players), [match, players]);
}
