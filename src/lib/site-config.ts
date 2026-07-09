/**
 * Centralized site configuration and per-route metadata templates.
 *
 * The production domain is read from `NEXT_PUBLIC_SITE_URL` so the live domain
 * can be swapped in a single place (environment variable) without touching page
 * code. When the variable is absent a placeholder origin is used — this keeps
 * local builds and previews working while making it obvious the value must be
 * set for production (see `docs/architecture.md` §1 — static export, no backend).
 *
 * All canonical / OpenGraph URLs are produced via `canonicalUrl(path)` to keep
 * `trailingSlash: true` (next.config.mjs) consistent across the site.
 */

import type { Mode } from "@/lib/content/schemas";

/** Default placeholder origin — overridden in production via NEXT_PUBLIC_SITE_URL. */
const DEFAULT_SITE_URL = "https://guess-the-game.example.com";

export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  url: string;
  locale: string;
  twitterHandle: string;
  themeColor: string;
  ogImage: string;
}

export const SITE_CONFIG: SiteConfig = {
  name: "Guess the Game",
  shortName: "Guess the Game",
  description:
    "Play five guessing game modes — Daily Mixed Challenge, Keywords, Emoji, Screenshot, and Timeline. No login, no ads, plays in under three minutes.",
  // `||` (not `??`) so an empty-string env var also falls back — a bare ""
  // origin would produce invalid relative canonical/OG URLs and break the
  // build (see docs/deployment.md §6).
  url: process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
  locale: "en_US",
  twitterHandle: "@guessthegame",
  themeColor: "#0e1116",
  ogImage: "/og.png",
};

/**
 * Builds an absolute URL for a given site-relative path.
 *
 * Ensures a leading "/" and a trailing "/" so URLs match `trailingSlash: true`.
 * The root path "/" is returned as `${SITE_CONFIG.url}/`.
 */
export function canonicalUrl(path: string): string {
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  const withTrailing = withLeading.endsWith("/")
    ? withLeading
    : `${withLeading}/`;
  return `${SITE_CONFIG.url}${withTrailing}`;
}

/**
 * Builds an absolute URL without forcing a trailing slash. Use for static
 * assets (e.g. OG images at `/og.png`) where a trailing slash would be wrong.
 */
export function absoluteUrl(path: string): string {
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_CONFIG.url}${withLeading}`;
}

// --- Per-mode metadata templates -----------------------------------------

export interface ModeInfo {
  slug: Mode;
  name: string;
  /** ≤60 char title fragment (used as `%s | Guess the Game`). */
  title: string;
  /** ≤155 char meta description. */
  description: string;
  /** 3–5 natural keywords — no stuffing. */
  keywords: string[];
  /** In-body H1 text. */
  h1: string;
  /** 2–3 sentence static intro rendered in the page body. */
  intro: string;
  /** Short "How to play" brief rendered in the page body. */
  howTo: string;
  href: string;
}

export const MODES: readonly ModeInfo[] = [
  {
    slug: "keywords",
    name: "Keywords",
    title: "Keywords",
    description:
      "Keywords mode: guess the hidden target from progressively revealed keyword clues, vague to specific. Unlimited practice, no login.",
    keywords: ["keywords game", "word guess", "puzzle clues", "daily puzzle"],
    h1: "Keywords",
    intro:
      "Keywords is a guessing game where you identify a hidden target from up to six keyword clues. Clues are revealed one at a time, starting vague and becoming specific. Type a guess whenever you are ready, or reveal the next clue for an easier — but lower-scoring — path to the answer.",
    howTo:
      "Reveal clues one at a time, then type your guess. Each reveal and each wrong guess lowers your score, so balance confidence against information.",
    href: "/play/keywords",
  },
  {
    slug: "emoji",
    name: "Emoji",
    title: "Emoji",
    description:
      "Emoji mode: guess the target from an emoji sequence with optional category and first-letter hints. Unlimited practice, no login.",
    keywords: ["emoji game", "guess the emoji", "emoji puzzle", "daily puzzle"],
    h1: "Emoji",
    intro:
      "Emoji mode shows a short sequence of emojis that hint at a hidden target. The full sequence is visible from the start, so you can guess immediately or spend hints to narrow things down. Two hints are available — the category, then the first letter of the answer.",
    howTo:
      "Read the emoji sequence, then type your guess. Use the category and first-letter hints if you are stuck, but each hint lowers your score.",
    href: "/play/emoji",
  },
  {
    slug: "screenshot",
    name: "Screenshot",
    title: "Screenshot",
    description:
      "Screenshot mode: identify the subject of an image that starts blurred and sharpens on demand. Unlimited practice, no login.",
    keywords: [
      "screenshot game",
      "picture guessing",
      "image puzzle",
      "daily puzzle",
    ],
    h1: "Screenshot",
    intro:
      "Screenshot mode challenges you to identify the subject of an image that begins heavily blurred. Sharpen the image up to three times to bring it into focus. All images are public-domain or originally authored, so the game stays IP-safe.",
    howTo:
      "Look at the blurred image, then type your guess. Sharpen up to three times to reveal more detail, but each sharpen and each wrong guess lowers your score.",
    href: "/play/screenshot",
  },
  {
    slug: "timeline",
    name: "Timeline",
    title: "Timeline",
    description:
      "Timeline mode: arrange four to six items in chronological order, oldest to newest. Unlimited practice, no login.",
    keywords: [
      "timeline game",
      "chronological order",
      "history puzzle",
      "daily puzzle",
    ],
    h1: "Timeline",
    intro:
      "Timeline mode gives you four to six items and asks you to arrange them in chronological order, oldest to newest. Drag to reorder or use the move up/down buttons. Submit to score based on how many items are in the correct position.",
    howTo:
      "Drag items into chronological order, oldest first. Submit to score — hints that reveal an item's date are available but lower your score.",
    href: "/play/timeline",
  },
] as const;

const MODE_BY_SLUG: ReadonlyMap<Mode, ModeInfo> = new Map(
  MODES.map((m) => [m.slug, m]),
);

/** Returns the `ModeInfo` for a mode slug, or `undefined` if unknown. */
export function modeInfo(slug: Mode): ModeInfo | undefined {
  return MODE_BY_SLUG.get(slug);
}

/**
 * Returns the `ModeInfo` for a mode slug, throwing if not found.
 *
 * Use this in route handlers / page components where the slug is a compile-time
 * constant — the throw guarantees a non-`undefined` return so TypeScript can
 * narrow without a closure guard (function declarations are hoisted, so a
 * module-level `if (!info) throw` does not narrow inside them).
 */
export function getModeInfo(slug: Mode): ModeInfo {
  const info = MODE_BY_SLUG.get(slug);
  if (!info) {
    throw new Error(`Missing mode metadata for '${slug}'`);
  }
  return info;
}

/** Returns every `ModeInfo` except the one matching `currentSlug` (for related-mode links). */
export function otherModes(currentSlug: Mode): ModeInfo[] {
  return MODES.filter((m) => m.slug !== currentSlug);
}

// --- Domain catalogue (used by /categories) -------------------------------

export interface DomainInfo {
  slug: string;
  name: string;
  description: string;
}

export const DOMAINS: readonly DomainInfo[] = [
  {
    slug: "geography",
    name: "Geography",
    description:
      "Countries, landmarks, landforms, and natural phenomena from around the world.",
  },
  {
    slug: "science",
    name: "Science",
    description:
      "Discoveries, elements, organisms, and concepts from across the sciences.",
  },
  {
    slug: "history",
    name: "History",
    description:
      "Events, inventions, and figures spanning human history, arranged and recalled.",
  },
  {
    slug: "nature",
    name: "Nature",
    description:
      "Animals, plants, habitats, and the natural world in close-up detail.",
  },
  {
    slug: "everyday",
    name: "Everyday",
    description:
      "Familiar objects, foods, and activities from daily life turned into puzzles.",
  },
] as const;

// --- Page-level metadata templates ---------------------------------------

export interface PageMeta {
  /** ≤60 char title fragment (used as `%s | Guess the Game`). */
  title: string;
  /** ≤155 char meta description. */
  description: string;
  /** Site-relative path used to build the canonical URL. */
  path: string;
}

export const PAGE_METADATA = {
  home: {
    title: "Guess the Game — Daily puzzle challenges",
    description:
      "Play five guessing game modes — Daily Mixed Challenge, Keywords, Emoji, Screenshot, and Timeline. No login, no ads, under three minutes.",
    path: "/",
  },
  howToPlay: {
    title: "How to Play",
    description:
      "Rules for all five Guess the Game modes — Daily Mixed Challenge, Keywords, Emoji, Screenshot, and Timeline. Scoring, hints, and streaks explained.",
    path: "/how-to-play",
  },
  archive: {
    title: "Archive",
    description:
      "Browse and replay past Daily Mixed Challenges by date. Archive replays are practice and do not affect your streak.",
    path: "/archive",
  },
  categories: {
    title: "Categories",
    description:
      "Browse Guess the Game puzzles by domain — geography, science, history, nature, and everyday — and by play mode.",
    path: "/categories",
  },
  about: {
    title: "About",
    description:
      "About Guess the Game — a static, no-login daily puzzle game built with IP-safe, public-domain content.",
    path: "/about",
  },
  stats: {
    title: "Stats",
    description:
      "Your personal Guess the Game statistics — current streak, max streak, best daily score, and a 30-day activity heatmap.",
    path: "/stats",
  },
  share: {
    title: "Shared Result",
    description:
      "View a shared Guess the Game result, then play your own daily challenge and build a streak.",
    path: "/share",
  },
  archiveReplay: {
    title: "Archive Replay",
    description:
      "Replay a past Daily Mixed Challenge. Archive replays are practice and do not affect your streak.",
    path: "/archive",
  },
} as const satisfies Record<string, PageMeta>;
