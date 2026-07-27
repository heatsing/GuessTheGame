import type { Metadata } from "next";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";
import { DailyChallenge } from "@/components/game/DailyChallenge";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.daily.title,
  description: PAGE_METADATA.daily.description,
  path: PAGE_METADATA.daily.path,
  keywords: [
    "daily puzzle",
    "daily challenge",
    "word puzzle",
    "emoji puzzle",
    "streak game",
  ],
});

/**
 * Daily Mixed Challenge page (PRD §5.1).
 *
 * Server component: emits SEO metadata + a static H1/intro, then renders the
 * client `DailyChallenge` dashboard. The dashboard reads today's progress from
 * localStorage (via the storage adapter) and shows one card per mode plus the
 * daily total, streak multiplier, and share button once all four puzzles are
 * resolved.
 *
 * The page is fully static-cacheable: the interactive shell hydrates on the
 * client, where localStorage is available. The four mode cards link to
 * `/play/{mode}`, which serves the same daily puzzle via
 * `selectDailyPuzzleForMode` — so the player gets a consistent experience
 * whether they enter from /daily or from a mode page directly.
 */
export default function DailyPage() {
  return (
    <div
      style={{
        maxWidth: "1024px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-2)",
        }}
      >
        {PAGE_METADATA.daily.title}
      </h1>

      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
          maxWidth: "70ch",
        }}
      >
        {PAGE_METADATA.daily.description}
      </p>

      <DailyChallenge />
    </div>
  );
}
