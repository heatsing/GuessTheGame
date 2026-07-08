import { ReactNode } from "react";

export interface ErrorStateProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  actionLabel,
  onAction,
  children,
}: ErrorStateProps) {
  return (
    <div
      className="gtg-error-state"
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-8) var(--space-4)",
        textAlign: "center",
        backgroundColor: "var(--color-error-bg)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-error)",
        minHeight: "160px",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: "32px" }}>
        ⚠
      </span>
      <h3
        style={{
          fontSize: "var(--font-size-lg)",
          color: "var(--color-error)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--font-size-sm)",
          maxWidth: "400px",
        }}
      >
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="gtg-btn gtg-btn-outline gtg-btn-md"
          style={{
            marginTop: "var(--space-2)",
            minHeight: "44px",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text)",
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
      {children}
    </div>
  );
}
