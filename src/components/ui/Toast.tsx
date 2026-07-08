"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type ToastVariant = "info" | "success" | "error" | "warning";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="gtg-toast-container"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "var(--space-12)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: "var(--z-toast)" as string,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`gtg-toast gtg-toast-${toast.variant}`}
            role="status"
            style={{
              backgroundColor: "var(--color-surface-elevated)",
              color: "var(--color-text)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--color-border)",
              maxWidth: "360px",
              pointerEvents: "auto",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
