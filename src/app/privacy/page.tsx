import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.privacy.title,
  description: PAGE_METADATA.privacy.description,
  path: PAGE_METADATA.privacy.path,
});

/**
 * Privacy page (M-1 in docs/SECURITY-REVIEW.md).
 *
 * Documents the no-account, no-analytics, no-ads model and exactly what is
 * stored in localStorage (single key `gtg:state:v1`), the retention windows,
 * and how to clear/export it. All claims here must stay in sync with
 * src/storage/keys.ts (retention constants) and src/storage/types.ts
 * (PersistedState shape) — see the cross-references inline.
 */
export default function PrivacyPage() {
  return (
    <div
      style={{
        maxWidth: "820px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-6)",
        }}
      >
        Privacy
      </h1>

      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
        }}
      >
        Guess the Game is a static site with no database, no accounts, and no
        server-side storage. This page explains what data is stored, where it
        lives, how long it is kept, and how to remove it.
      </p>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          No accounts, no tracking
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          There is no login, no sign-up, and no user identifier. The site does
          not use analytics, advertising, or third-party tracking scripts. No
          cookies are set, and no personal information (name, email, IP
          address, or device identifier) is ever collected or transmitted.
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          The site is delivered as a static build — puzzle data is bundled at
          build time, and your progress never leaves your browser.
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          What is stored and where
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          All progress is saved in your browser&apos;s <code>localStorage</code>{" "}
          under a single key, <code>gtg:state:v1</code>. The stored data is
          game state only — it contains no personal information. Specifically,
          it holds:
        </p>
        <ul
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            paddingLeft: "var(--space-6)",
            marginBottom: "var(--space-3)",
          }}
        >
          <li>Daily progress per mode (puzzle ID, score, status, wrong guesses).</li>
          <li>Current and maximum streak, with the last active UTC date.</li>
          <li>Aggregate statistics (games played, best score, per-mode counts).</li>
          <li>Settings (theme, reduced-motion, sound preference).</li>
          <li>Completed and recently played puzzle IDs.</li>
          <li>Unlocked achievement IDs.</li>
        </ul>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          If <code>localStorage</code> is unavailable (for example, in Safari
          private mode), the site automatically falls back to in-memory storage
          that is cleared when you close the tab.
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Retention
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          Stored data is pruned automatically as you play to stay within a
          small footprint (under 80&nbsp;KB). The retention windows are:
        </p>
        <ul
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            paddingLeft: "var(--space-6)",
          }}
        >
          <li>Daily progress entries: kept for 60 days, then pruned.</li>
          <li>Activity heatmap data: the most recent 30 days.</li>
          <li>Recently played puzzle IDs: the 20 most recent.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Export and reset
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          Because the data lives only in your browser, you are always in
          control. You can clear everything Guess the Game has stored at any
          time using your browser&apos;s site data controls — remove the{" "}
          <code>gtg:state:v1</code> key for this site, or clear all site data
          for this origin.
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          Clearing storage resets your streak, statistics, and history to
          their defaults. There is no cloud copy to restore from — once
          removed, the data is gone.
        </p>
      </section>

      <section>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Content and copyright
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          All visual assets are public-domain, originally authored, or
          generated silhouettes — no copyrighted screenshots, logos, or
          characters. If you believe an asset violates a copyright, see the{" "}
          <Link href="/contact">contact page</Link> for how to raise a
          takedown inquiry.
        </p>
      </section>
    </div>
  );
}
