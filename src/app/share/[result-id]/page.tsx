import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Result",
  description: "View a shared Guess the Game result.",
};

// Shell placeholder — will be replaced with real result IDs when sharing is implemented.
export function generateStaticParams(): { "result-id": string }[] {
  return [{ "result-id": "placeholder" }];
}

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ "result-id": string }>;
}) {
  const resolved = await params;
  const resultId = resolved["result-id"];

  return (
    <div
      style={{
        maxWidth: "640px",
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
        {resultId}
      </p>
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Shared Result
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        View this player&apos;s result.
      </p>
    </div>
  );
}
