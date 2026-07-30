import type { Metadata } from "next";
import Link from "next/link";

import { PAGE_METADATA } from "@/lib/site-config";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: PAGE_METADATA.contact.title,
  description: PAGE_METADATA.contact.description,
  path: PAGE_METADATA.contact.path,
});

/**
 * GitHub repository URL — the primary contact channel. Sourced from
 * AGENTS.md ("Repository: https://github.com/heatsing/GuessTheGame") so the
 * project's canonical contact path stays in sync with the repo record.
 */
const REPOSITORY_URL = "https://github.com/heatsing/GuessTheGame";

/**
 * External link properties — per docs/SECURITY-REVIEW.md "External Link Safety",
 * every external `target="_blank"` anchor is paired with
 * `rel="noopener noreferrer"` to prevent tab-nabbing and Referrer leakage.
 */
const externalLinkProps = {
  href: REPOSITORY_URL,
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

/**
 * Contact page (M-1 in docs/SECURITY-REVIEW.md).
 *
 * Provides a discoverable channel for bug reports, feature requests, and —
 * critically — copyright/takedown inquiries. The takedown path is required
 * even though all assets are IP-safe: if a contributor accidentally adds a
 * non-IP-safe asset, rights holders need a stated channel to report it.
 */
export default function ContactPage() {
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
        Contact
      </h1>

      <p
        style={{
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
        }}
      >
        Guess the Game is an open, static project with no backend and no
        support staff. The fastest way to reach the maintainers is through
        the public GitHub repository.
      </p>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Bugs and feature requests
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          For bug reports, accessibility issues, or feature ideas, please
          open a GitHub Issue. Include the mode you were playing, the UTC
          date, your browser, and a short reproduction step list so the
          problem can be reproduced without guessing.
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          <a {...externalLinkProps}>Open an issue on GitHub &rarr;</a>
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Copyright and takedown inquiries
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-3)",
          }}
        >
          All visual assets in Guess the Game are intended to be
          public-domain, originally authored, or generated silhouettes. No
          copyrighted screenshots, trademarked logos, character art, or box
          art is used. If you believe an asset has been included in error or
          you are a rights holder requesting removal, please open a GitHub
          Issue with the label <code>copyright</code> and include:
        </p>
        <ul
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            paddingLeft: "var(--space-6)",
            marginBottom: "var(--space-3)",
          }}
        >
          <li>The puzzle ID or page URL where the asset appears.</li>
          <li>The original work and its rights holder.</li>
          <li>A contact method for follow-up.</li>
        </ul>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          Takedown requests are reviewed promptly. Because the site is a
          static build, a confirmed infringing asset is removed in the next
          deployment rather than served from a runtime backend.
        </p>
      </section>

      <section style={{ marginBottom: "var(--space-8)" }}>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          Privacy questions
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          For questions about data storage, retention, or the no-account
          model, see the <Link href="/privacy">privacy page</Link>. If the
          documentation there does not answer your question, open a GitHub
          Issue with the label <code>privacy</code>.
        </p>
      </section>

      <section>
        <h2
          style={{
            fontSize: "var(--font-size-lg)",
            marginBottom: "var(--space-2)",
          }}
        >
          What to expect
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          This is a side project maintained in spare time — there is no
          guaranteed response window, and there is no email or phone
          channel. GitHub Issues is the only monitored contact path.
          Sensitive reports (for example, security vulnerabilities) can be
          filed as a private GitHub Security Advisory on the repository
          instead of a public Issue.
        </p>
      </section>
    </div>
  );
}
