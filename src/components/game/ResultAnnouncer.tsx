"use client";

import { useEffect, useRef, useState } from "react";

export type GameResult =
  | { status: "idle" }
  | { status: "correct"; answer: string }
  | { status: "wrong"; guess: string }
  | { status: "given_up"; answer: string }
  | { status: "info"; message: string };

export interface ResultAnnouncerProps {
  result: GameResult;
}

/**
 * Screen-reader announcer for game outcomes. Game results must not rely on
 * color alone — this component renders a visually-hidden `aria-live` region
 * that conveys the outcome in plain text ("Correct! The answer was…", "Not
 * quite — try again", "You gave up. The answer was…").
 *
 * A short text badge is also rendered visually so sighted players see a
 * non-color cue (icon + word) alongside any color treatment.
 */
export function ResultAnnouncer({ result }: ResultAnnouncerProps) {
  const [message, setMessage] = useState("");
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessage(renderMessage(result));
  }, [result]);

  return (
    <div ref={regionRef} aria-live="assertive" aria-atomic="true">
      <span className="visually-hidden">{message}</span>
      {result.status !== "idle" && (
        <span aria-hidden="true" style={badgeStyle(result.status)}>
          {iconFor(result.status)} {labelFor(result.status)}
        </span>
      )}
    </div>
  );
}

function renderMessage(r: GameResult): string {
  switch (r.status) {
    case "idle":
      return "";
    case "correct":
      return `Correct! The answer was ${r.answer}.`;
    case "wrong":
      return `Not quite — “${r.guess}” is not the answer. Try again.`;
    case "given_up":
      return `You gave up. The answer was ${r.answer}.`;
    case "info":
      return r.message;
  }
}

function iconFor(status: GameResult["status"]): string {
  switch (status) {
    case "correct":
      return "✓";
    case "wrong":
      return "✗";
    case "given_up":
      return "◌";
    case "info":
      return "ℹ";
    case "idle":
      return "";
  }
}

function labelFor(status: GameResult["status"]): string {
  switch (status) {
    case "correct":
      return "Correct";
    case "wrong":
      return "Try again";
    case "given_up":
      return "Given up";
    case "info":
      return "Info";
    case "idle":
      return "";
  }
}

function badgeStyle(status: GameResult["status"]): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-semibold)",
    border: "1px solid var(--color-border)",
  };
  switch (status) {
    case "correct":
      return { ...base, backgroundColor: "var(--color-success-bg)", borderColor: "var(--color-success)", color: "var(--color-success)" };
    case "wrong":
      return { ...base, backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)", color: "var(--color-error)" };
    case "given_up":
      return { ...base, backgroundColor: "var(--color-warning-bg)", borderColor: "var(--color-warning)", color: "var(--color-warning)" };
    case "info":
      return { ...base, color: "var(--color-text-muted)" };
    case "idle":
      return base;
  }
}
