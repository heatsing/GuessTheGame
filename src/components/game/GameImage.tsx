"use client";

import { useState } from "react";

export interface GameImageProps {
  /** Public path, e.g. `/images/puzzles/ss-001.webp`. */
  src: string;
  /** Required accessible description. Use "" only when the image is purely
   *  decorative AND an adjacent text cue conveys the same information. */
  alt: string;
  /** Fixed intrinsic pixel dimensions — prevents layout shift (CLS). */
  width: number;
  height: number;
  /** Above-the-fold clue image — sets fetchpriority + eager loading. */
  priority?: boolean;
  /** Optional thumbnail/preview src shown before the full image loads. */
  blurSrc?: string;
  /** Called when the image fails to load, so the game can show a fallback. */
  onError?: () => void;
  className?: string;
}

/**
 * Performance- and accessibility-aware image for clue content:
 *  - explicit `width`/`height` to reserve space (no CLS)
 *  - `loading="lazy"` + `decoding="async"` for below-fold images
 *  - `fetchpriority="high"` + eager loading for the first (priority) clue
 *  - graceful fallback state on load error (announced to screen readers)
 *
 * Uses a plain `<img>` because the static export disables next/image
 * optimization (`images.unoptimized: true`).
 */
export function GameImage({
  src,
  alt,
  width,
  height,
  priority = false,
  blurSrc,
  onError,
  className,
}: GameImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`Image failed to load: ${alt}`}
        className={className}
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          padding: "var(--space-2)",
          textAlign: "center",
        }}
      >
        Image unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export disables next/image optimization; explicit dimensions prevent CLS
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      style={{
        width: "100%",
        height: "auto",
        aspectRatio: `${width} / ${height}`,
        objectFit: "cover",
        borderRadius: "var(--radius-md)",
        backgroundImage: blurSrc ? `url(${blurSrc})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}
