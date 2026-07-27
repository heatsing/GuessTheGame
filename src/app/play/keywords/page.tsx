import type { Metadata } from "next";

import { getModeInfo } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import { RelatedModes } from "@/components/seo/RelatedModes";
import { selectDailyPuzzleForMode } from "@/lib/game/select";
import { KeywordsGame } from "@/components/game/KeywordsGame";
import { utcToday } from "@/lib/game/utc";
import type { KeywordsPuzzle } from "@/lib/content/schemas";

const info = getModeInfo("keywords");

export const metadata: Metadata = buildPageMetadata({
  title: info.title,
  description: info.description,
  path: info.href,
  keywords: info.keywords,
});

/**
 * Keywords play page (PRD §5.2).
 *
 * Server component: fetches the puzzle at build/request time via the
 * deterministic daily selector (same UTC date → same puzzle for every visitor,
 * SSR-friendly — no Math.random on the server). The playable board is a client
 * component (`KeywordsGame`) that owns guess/reveal state and persists results
 * via `recordModeResult`.
 *
 * A `?seed=<string>` search param could be added later for unlimited play
 * (selecting via `selectPuzzleBySeed`); for MVP the daily puzzle suffices and
 * keeps the page fully static-cacheable.
 */
export default function KeywordsPage() {
  const today = utcToday();
  const puzzle = selectDailyPuzzleForMode("keywords", today) as KeywordsPuzzle | null;

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        {info.h1}
      </h1>

      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
        }}
      >
        {info.intro}
      </p>

      <section
        aria-label="How to play Keywords"
        className="gtg-card"
        style={{ marginBottom: "var(--space-8)" }}
      >
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          How to play
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          {info.howTo}
        </p>
      </section>

      <section aria-label="Play Keywords" className="gtg-card">
        {puzzle ? (
          <KeywordsGame puzzle={puzzle} utcDate={today} />
        ) : (
          <p style={{ color: "var(--color-text-muted)", padding: "var(--space-6)", textAlign: "center" }}>
            No Keywords puzzle is available right now. Please check back later.
          </p>
        )}
      </section>

      <RelatedModes currentSlug={info.slug} />
    </div>
  );
}
