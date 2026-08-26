import { webDarkTheme, webLightTheme } from "@fluentui/react-components";
import type { Theme as FluentTheme } from "@fluentui/react-components";
import type { Mood } from "../engine";

/**
 * Theming, in two halves — and the split is the important part.
 *
 * 1. THE CHROME is Fluent. Buttons, switches, the control bar: all of it comes
 *    from @fluentui/react-components, themed by spreading a stock web theme and
 *    overriding a handful of brand tokens. Griffel (Fluent's CSS-in-JS) is the
 *    reason — it buys atomic CSS, real hover and focus states, and media
 *    queries, none of which inline styles can express.
 *
 * 2. THE ART is not. A bowling lane is not a control surface; it is a lit
 *    room with a machine at the end of it, and Fluent has no tokens for "oiled
 *    maple" or "the colour a pin deck glows". Those live in `art` below.
 *
 * Same system as juggling-engine's theme.ts on purpose — one stack across the
 * repo family means a reader who has seen one has seen both, and somebody can
 * restyle the controls without touching the look of the lane, and vice versa.
 */

// ── 1 · Chrome ───────────────────────────────────────────────────────────────
//
// The same brand teal as juggling-engine, unchanged: the repos are siblings
// and should read as one family at the one place the chrome shows a colour.
export const darkTheme: FluentTheme = {
  ...webDarkTheme,
  colorBrandBackground: "#1a7f96",
  colorBrandBackgroundHover: "#2299b4",
  colorBrandBackgroundPressed: "#146678",
  colorBrandForeground1: "#62e6ff",
  colorBrandForeground2: "#3fd0ee",
};

export const lightTheme: FluentTheme = {
  ...webLightTheme,
  colorBrandBackground: "#146678",
  colorBrandBackgroundHover: "#1a7f96",
  colorBrandBackgroundPressed: "#0e4d5b",
  colorBrandForeground1: "#146678",
  colorBrandForeground2: "#1a7f96",
};

// ── 2 · Art ──────────────────────────────────────────────────────────────────

/**
 * The stage palette. Names say what a colour DOES, not where it came from.
 * The page-level tokens (bg, border, muted, text, accent, panel, mono) are
 * juggling-engine's night stage verbatim — same family, same night. The lane
 * tokens are this repo's own: the geometry of a lane was ported from the art
 * this engine originally drove, but the dressing was re-chosen for a neutral
 * page rather than anybody's particular alley.
 */
export interface ArtTheme {
  /** Page ground. Dark, so the lit lane reads as the bright thing. */
  bg: string;
  /** Panel edges and rules. */
  border: string;
  /** Secondary type — hints, annotations. */
  muted: string;
  /** Primary type. */
  text: string;
  /** Headings and language — the family cyan, same as a focused input. */
  accent: string;
  /** Failures, illegal input, a red check row. */
  invalid: string;
  /** Panel fill, one step up from the page. */
  panel: string;
  /** Marks and rules belong in a mono face. */
  mono: string;
  /** The wax pencil writes in a heavy casual hand. */
  hand: string;

  /** Oiled maple, foul line to deck. */
  laneWood: string;
  laneWoodDeep: string;
  /** The channels flanking the bed. */
  gutter: string;
  /** Board seams. */
  board: string;
  /** The recessed pin deck, and its light strip. */
  deck: string;
  deckGlow: string;
  /** Pin body and neck stripes, front row in full light. */
  pin: string;
  pinStripe: string;
  /** Rails, trim, the machine's steel. */
  chrome: string;
  chromeDeep: string;
  /** The room around the lane, classic night. */
  room: string;
  roomWall: string;

  /** Starlight — the same lane under blacklight. Geometry never changes. */
  uvRoom: string;
  uvBed: string;
  uvBedDeep: string;
  uvCyan: string;
  uvMagenta: string;
  uvViolet: string;

  /** The scoresheet acetate under its hot lamp, and the pencil that marks it. */
  acetate: string;
  wax: string;
  lampGlow: string;

  /**
   * The five mood states, as colours. The ENGINE only ever says which of its
   * five neutral names is true (`classifyMood`); this mapping is presentation,
   * and it is drawn from the family's own prop palette rather than any
   * consumer's — the same six LED tones juggling-engine cycles its props with.
   */
  moods: Record<Mood, string>;
}

export const nightArt: ArtTheme = {
  bg: "#131022",
  border: "#282344",
  muted: "#9a92b8",
  text: "#eae6f6",
  accent: "#62e6ff",
  invalid: "#f25c54",
  panel: "rgba(8,7,16,0.5)",
  mono: "'Cascadia Code', 'Fira Code', 'Consolas', ui-monospace, monospace",
  // A HAND, ON EVERY PLATFORM — and the fallback is the whole point.
  //
  // This was 'Segoe Print', 'Comic Sans MS', cursive. Neither of those ships
  // on iOS, so an iPhone fell straight through to generic `cursive`, which it
  // resolves to Snell Roundhand — a hairline formal script. The coach's line
  // and the scoresheet's marks were rendering in it, which is why they read
  // as faint and unreadable there rather than hand-written.
  //
  // Marker Felt and Bradley Hand both ship on iOS and macOS and are heavy
  // enough to survive at scoresheet size; Marker Felt leads because this is
  // meant to look like a marker on acetate anyway. Generic `cursive` stays
  // last as a true fallback, not as the iOS default it had quietly become.
  hand: "'Segoe Print', 'Marker Felt', 'Bradley Hand', 'Comic Sans MS', cursive",

  laneWood: "#b98955",
  laneWoodDeep: "#8a6238",
  gutter: "#242c30",
  board: "#6e4c2c",
  deck: "#171d21",
  deckGlow: "#7ee787",
  pin: "#f4efe2",
  pinStripe: "#c0463f",
  chrome: "#cdd8dc",
  chromeDeep: "#7f9097",
  room: "#12181c",
  roomWall: "#1b2429",

  uvRoom: "#0a0b22",
  uvBed: "#262b66",
  uvBedDeep: "#151840",
  uvCyan: "#5ff0e8",
  uvMagenta: "#ff5fd2",
  uvViolet: "#a58cff",

  acetate: "#f5ebcf",
  wax: "#33291f",
  lampGlow: "#ffdf9e",

  moods: {
    idle: "#5fd0c4",
    coaching: "#ffe66d",
    rage: "#f25c54",
    celebration: "#ffb347",
    suspense: "#a78bfa",
  },
};

/** Base plus overrides. Any subset of tokens may be replaced. */
export function makeArt(overrides: Partial<ArtTheme> = {}, base: ArtTheme = nightArt): ArtTheme {
  return { ...base, ...overrides };
}

/**
 * The art palette components fall back to when not handed one.
 *
 * A mutable module default rather than React context on purpose, same call as
 * juggling-engine: the lane atoms are leaf components rendered in tight loops,
 * and an app that wants one look everywhere sets it once at startup instead of
 * wrapping a provider around every pin.
 */
export let art: ArtTheme = nightArt;

/** Swap the default art palette. */
export function setArt(next: ArtTheme): void {
  art = next;
}
