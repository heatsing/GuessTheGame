import type { Metadata } from "next";

import { getModeInfo } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import { RelatedModes } from "@/components/seo/RelatedModes";
import { selectDailyPuzzleForMode } from "@/lib/game/select";
import { TimelineGame } from "@/components/game/TimelineGame";
import { utcToday } from "@/lib/game/utc";
import type { TimelinePuzzle } from "@/lib/content/schemas";

const info = getModeInfo("timeline");

export const metadata: Metadata = buildPageMetadata({
  title: info.title,
  description: info.description,
  path: info.href,
  keywords: info.keywords,
});

/**
 * Timeline play page (PRD §5.5).
 *
 * Server component: fetches the puzzle at build/request time via the
 * deterministic daily selector (same UTC date → same puzzle for every visitor,
 * SSR-friendly — no Math.random on the server). The playable board is a client
 * component (`TimelineGame`) that owns reorder/hint state and persists results
 * via `recordModeResult`.
 */
export default function TimelinePage() {
  const today = utcToday();
  const puzzle = selectDailyPuzzleForMode("timeline", today) as TimelinePuzzle | null;

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
        aria-label="How to play Timeline"
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

      <section aria-label="Play Timeline" className="gtg-card">
        {puzzle ? (
          <TimelineGame puzzle={puzzle} utcDate={today} />
        ) : (
          <p style={{ color: "var(--color-text-muted)", padding: "var(--space-6)", textAlign: "center" }}>
            No Timeline puzzle is available right now. Please check back later.
          </p>
        )}
      </section>

      <RelatedModes currentSlug={info.slug} />
    </div>
  );
}
