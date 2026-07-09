"use client";

import { useState } from "react";

export interface ShareButtonProps {
  /** Text payload to share (the result card). */
  text: string;
  /** Optional URL to share. */
  url?: string;
  /** Optional window title for the native share sheet. */
  title?: string;
  /** Accessible label override (defaults to "Share result"). */
  label?: string;
}

type Outcome = "idle" | "shared" | "copied" | "error";

/**
 * Accessible share control. Prefers the Web Share API when available; if it is
 * missing (desktop browsers) or rejects, falls back to the Clipboard API and
 * announces the outcome via an aria-live region — not by color alone.
 */
export function ShareButton({ text, url, title, label = "Share result" }: ShareButtonProps) {
  const [outcome, setOutcome] = useState<Outcome>("idle");

  async function handleShare() {
    setOutcome("idle");
    const shareData: ShareData = { text };
    if (url) shareData.url = url;
    if (title) shareData.title = title;

    // 1. Web Share API (mobile / supporting browsers)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setOutcome("shared");
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet — not a real failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Fall through to clipboard fallback.
      }
    }

    // 2. Clipboard API fallback
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setOutcome("copied");
        return;
      } catch {
        setOutcome("error");
        return;
      }
    }

    // 3. No share/clipboard available at all
    setOutcome("error");
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <button
        type="button"
        className="gtg-btn gtg-btn-primary gtg-btn-md"
        onClick={handleShare}
        aria-label={label}
      >
        {label}
      </button>
      <div aria-live="polite" style={{ minHeight: "var(--font-size-sm)" }}>
        {outcome === "copied" && (
          <span style={outcomeStyle("success")} role="status">
            ✓ Copied to clipboard
          </span>
        )}
        {outcome === "shared" && (
          <span style={outcomeStyle("success")} role="status">
            ✓ Shared
          </span>
        )}
        {outcome === "error" && (
          <span style={outcomeStyle("error")} role="status">
            ✗ Could not share — please copy manually.
          </span>
        )}
      </div>
    </div>
  );
}

function outcomeStyle(kind: "success" | "error"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    fontSize: "var(--font-size-sm)",
    color: kind === "success" ? "var(--color-success)" : "var(--color-error)",
  };
}
