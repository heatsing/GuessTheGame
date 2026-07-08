import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archive Replay",
  description:
    "Replay a past Daily Mixed Challenge. Archive replays are practice and do not affect your streak.",
};

// Shell placeholder — will be replaced with real schedule when content is curated.
export function generateStaticParams(): { date: string }[] {
  return [{ date: "2026-01-01" }];
}

export default async function ArchiveReplayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  return (
    <div
      style={{
        maxWidth: "1024px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          marginBottom: "var(--space-2)",
        }}
      >
        {date}
      </p>
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Archive Replay
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Replay this past challenge.
      </p>
    </div>
  );
}
