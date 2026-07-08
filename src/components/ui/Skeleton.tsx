export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: string;
  ariaLabel?: string;
}

export function Skeleton({
  width = "100%",
  height = "20px",
  rounded = "var(--radius-md)",
  ariaLabel = "Loading",
}: SkeletonProps) {
  return (
    <div
      className="gtg-skeleton"
      role="status"
      aria-label={ariaLabel}
      style={{
        width,
        height,
        borderRadius: rounded,
        backgroundColor: "var(--color-skeleton)",
        animation: "skeleton-pulse 1.2s ease-in-out infinite",
      }}
    />
  );
}

export function SkeletonBlock({
  lines = 3,
  ariaLabel = "Loading content",
}: {
  lines?: number;
  ariaLabel?: string;
}) {
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="16px"
          width={i === lines - 1 ? "60%" : "100%"}
          ariaLabel=""
        />
      ))}
    </div>
  );
}
