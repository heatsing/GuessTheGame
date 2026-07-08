import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Screenshot",
  description:
    "Screenshot mode — identify the subject of an image that starts blurred and sharpens on demand. Unlimited practice, no login.",
};

export default function ScreenshotPage() {
  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          marginBottom: "var(--space-3)",
        }}
      >
        Screenshot
      </h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        Identify the sharpened image.
      </p>
    </div>
  );
}
