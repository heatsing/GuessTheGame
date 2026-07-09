import Link from "next/link";
import { Button } from "@/components/ui/Button";

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
        }}
      >
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/">
        <Button variant="primary" size="md">
          Back to home
        </Button>
      </Link>
    </div>
  );
}
