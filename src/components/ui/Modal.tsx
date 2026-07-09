"use client";

import { ReactNode, useEffect, useRef } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
  /** ID of an element describing the dialog's purpose (optional). */
  describedBy?: string;
}

/**
 * Modal dialog with focus trapping, Escape-to-close, scroll lock, and
 * background `inert` so screen readers and Tab key cannot reach page content
 * behind the dialog while it is open.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  labelledBy,
  describedBy,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const inertedEls = useRef<Element[]>([]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Mark siblings of the overlay as inert so the page behind is neither
    // focusable nor announced by screen readers while the dialog is open.
    const overlay = dialogRef.current?.parentElement;
    inertedEls.current = [];
    if (overlay && overlay.parentElement) {
      for (const sib of Array.from(overlay.parentElement.children)) {
        if (sib === overlay) continue;
        if (sib.tagName === "SCRIPT") continue;
        sib.setAttribute("inert", "");
        inertedEls.current.push(sib);
      }
    }

    const focusable = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement | null;
    focusable?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      for (const el of inertedEls.current) {
        el.removeAttribute("inert");
      }
      inertedEls.current = [];
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const titleId = labelledBy ?? "modal-title";

  return (
    <div
      className="gtg-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)" as string,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        animation: `modal-enter var(--duration-base) var(--easing-emphasized)`,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={describedBy}
        className="gtg-modal"
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "var(--space-6)",
        }}
      >
        {title && (
          <h2
            id={titleId}
            style={{
              fontSize: "var(--font-size-xl)",
              marginBottom: "var(--space-4)",
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
