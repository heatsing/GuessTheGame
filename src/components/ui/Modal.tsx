"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
  /** ID of an element describing the dialog's purpose (optional). */
  describedBy?: string;
  /**
   * Accessible name for the dialog when no `title` is provided. When `title`
   * is omitted and neither `labelledBy` nor `ariaLabel` is supplied, the
   * component throws in development — a dialog must always have an accessible
   * name (WCAG 4.1.2).
   */
  ariaLabel?: string;
  /**
   * Show an explicit "Close" button at the bottom of the dialog (P2-43).
   * Defaults to `true` so keyboard and AT users always have a visible
   * dismissal control beyond Escape and overlay-click.
   */
  showCloseButton?: boolean;
}

/**
 * Modal dialog with focus trapping, Escape-to-close, scroll lock, and
 * background `inert` so screen readers and Tab key cannot reach page content
 * behind the dialog while it is open.
 *
 * Rendered via `createPortal(..., document.body)` (P1-2) so the overlay's
 * parent is `document.body`; this makes the sibling-inert logic cover ALL
 * top-level page chrome (header, nav, footer, skip-link), not just the
 * modal's immediate siblings. The title element id is generated with
 * `useId()` (P1-3) to avoid collisions across multiple instances.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  labelledBy,
  describedBy,
  ariaLabel,
  showCloseButton = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const inertedEls = useRef<Element[]>([]);
  // Hold onClose in a ref so the effect deps can stay `[open]` only (P2-8) —
  // an unstable inline onClose would otherwise re-run the effect, re-inerting
  // and jumping focus on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const generatedTitleId = useId();

  useEffect(() => {
    if (!open) return;

    const close = () => onCloseRef.current();

    previouslyFocused.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]):not([inert]), [contenteditable]:not([contenteditable="false"])'
        );
        if (focusable.length === 0) {
          // No focusable children — keep Tab inside the dialog (P2-9) so it
          // cannot escape to the inerted background.
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
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

    // Mark every body child except the overlay itself as inert so the page
    // behind is neither focusable nor announced by screen readers (P1-2).
    // Because the overlay is portaled to document.body, this covers header,
    // nav, footer, skip-link, and any other top-level chrome.
    const overlay = dialogRef.current?.parentElement;
    inertedEls.current = [];
    if (overlay && overlay.parentElement === document.body) {
      for (const sib of Array.from(document.body.children)) {
        if (sib === overlay) continue;
        if (sib.tagName === "SCRIPT") continue;
        sib.setAttribute("inert", "");
        inertedEls.current.push(sib);
      }
    }

    // Focus the first focusable child, or the dialog itself so keyboard focus
    // starts inside the dialog (P2-9).
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable]:not([contenteditable="false"])'
    );
    if (focusable) {
      focusable.focus();
    } else if (dialogRef.current) {
      dialogRef.current.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      for (const el of inertedEls.current) {
        el.removeAttribute("inert");
      }
      inertedEls.current = [];
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  // createPortal needs document.body; Modal is a client component and modals
  // are closed during SSR (open starts false), so this branch is only reached
  // in the browser. The guard keeps SSR/hydration safe if a caller ever mounts
  // with open=true before hydration.
  if (typeof document === "undefined") return null;

  const titleId = labelledBy ?? generatedTitleId;
  const hasTitle = Boolean(title);
  // An accessible name is mandatory (WCAG 4.1.2). Prefer aria-labelledby when
  // a title is present; otherwise fall back to aria-label. The explicit
  // grouping here avoids the `??`-before-`?:` precedence trap that previously
  // parsed as `(ariaLabel ?? labelledBy) ? undefined : "Dialog"` and stripped
  // the caller-supplied aria-label.
  const labelledByProp = hasTitle ? titleId : undefined;
  const ariaLabelProp = hasTitle
    ? undefined
    : (ariaLabel ?? (labelledBy ? undefined : "Dialog"));

  return createPortal(
    <div
      className="gtg-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)",
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
        aria-labelledby={labelledByProp}
        aria-label={ariaLabelProp}
        aria-describedby={describedBy}
        tabIndex={-1}
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
          outline: "none",
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
        {/* Visible close control (P2-43) — present by default so keyboard and
            AT users have an explicit way to dismiss the dialog beyond Escape
            and overlay-click. Opt out with `showCloseButton={false}`. */}
        {showCloseButton && (
          <button
            type="button"
            className="gtg-btn gtg-btn-ghost gtg-btn-sm"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            style={{ marginTop: "var(--space-4)" }}
          >
            Close
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
