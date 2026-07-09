import Link from "next/link";
import type { Metadata } from "next";

import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Page Not Found",
  description:
    "The page you are looking for does not exist. Return home or jump into a guessing game.",
  path: "/404",
  noindex: true,
});

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/play/keywords", label: "Keywords" },
  { href: "/play/emoji", label: "Emoji" },
  { href: "/play/screenshot", label: "Screenshot" },
  { href: "/play/timeline", label: "Timeline" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/archive", label: "Archive" },
  { href: "/categories", label: "Categories" },
];

export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "0 auto",
        padding: "var(--space-12) var(--space-4)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text)",
          marginBottom: "var(--space-2)",
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: "var(--font-size-xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Page not found
      </h1>
      <p
        style={{
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-6)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        The page you are looking for doesn&apos;t exist or has been moved. Pick a
        destination below to keep playing.
      </p>
      <nav aria-label="Quick links">
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-2)",
            justifyContent: "center",
            padding: 0,
            margin: 0,
          }}
        >
          {quickLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="gtg-btn gtg-btn-outline gtg-btn-md"
                style={{ textDecoration: "none" }}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
