import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Lazy-loads a play-mode game component so that non-current-mode code is not
 * shipped in the initial page bundle. Each mode's interactive game is a client
 * component; importing it eagerly on a play page would pull every other mode's
 * client code into the same chunk.
 *
 * Usage:
 *   const KeywordsGame = lazyPlayMode(() => import("./keywords/KeywordsGame"));
 *
 * The fallback skeleton keeps the reserved space stable (no layout shift).
 */
export function lazyPlayMode<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return dynamic(factory, {
    loading: () => <PlayModeFallback />,
    ssr: false,
  });
}

function PlayModeFallback() {
  return (
    <div
      role="status"
      aria-label="Loading game"
      style={{
        minHeight: "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-skeleton)",
        borderRadius: "var(--radius-lg)",
        animation: "skeleton-pulse 1.2s ease-in-out infinite",
      }}
    />
  );
}
