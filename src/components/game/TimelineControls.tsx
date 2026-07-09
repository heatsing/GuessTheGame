"use client";

import { useState } from "react";

export interface TimelineItem {
  id: string;
  title: string;
}

export interface TimelineControlsProps {
  items: TimelineItem[];
  /** Called with the reordered array after a move. */
  onReorder: (next: TimelineItem[]) => void;
  /** Called when the player submits the current order for checking. */
  onSubmit?: () => void;
}

/**
 * Keyboard- and screen-reader-accessible alternative to drag-and-drop for the
 * Timeline mode. Each item exposes "Move up" / "Move down" buttons (44px
 * touch targets) and the list is an ARIA listbox so assistive tech announces
 * position. Sighted players can also use the buttons instead of dragging.
 *
 * Drag-and-drop may still be layered on top later; this guarantees a working
 * non-pointer path regardless of motor ability or input device.
 */
export function TimelineControls({ items, onReorder, onSubmit }: TimelineControlsProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const removed = next.splice(index, 1);
    const moved = removed[0];
    if (!moved) return;
    next.splice(target, 0, moved);
    onReorder(next);
    setFocusedIndex(target);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(index, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(index, 1);
    }
  }

  return (
    <div>
      <p id="timeline-instructions" style={instructionStyle}>
        Arrange the items oldest to newest. Use the Move up / Move down buttons
        or Arrow keys to reorder.
      </p>
      <ol
        role="list"
        aria-labelledby="timeline-instructions"
        style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            tabIndex={0}
            onFocus={() => setFocusedIndex(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            aria-label={`Position ${index + 1} of ${items.length}: ${item.title}`}
            style={itemStyle(focusedIndex === index)}
          >
            <span style={{ flex: 1 }} aria-hidden="true">
              <span style={positionBadge}>{index + 1}</span>
              {item.title}
            </span>
            <span style={{ display: "inline-flex", gap: "var(--space-1)" }}>
              <button
                type="button"
                className="gtg-btn gtg-btn-outline gtg-btn-sm"
                aria-label={`Move ${item.title} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ▲ Up
              </button>
              <button
                type="button"
                className="gtg-btn gtg-btn-outline gtg-btn-sm"
                aria-label={`Move ${item.title} down`}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                ▼ Down
              </button>
            </span>
          </li>
        ))}
      </ol>
      {onSubmit && (
        <button
          type="button"
          className="gtg-btn gtg-btn-primary gtg-btn-md"
          onClick={onSubmit}
          style={{ marginTop: "var(--space-4)" }}
        >
          Submit order
        </button>
      )}
    </div>
  );
}

const instructionStyle: React.CSSProperties = {
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-sm)",
  marginBottom: "var(--space-3)",
};

function itemStyle(focused: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    backgroundColor: "var(--color-surface)",
    border: `1px solid ${focused ? "var(--color-border-focus)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    minHeight: "44px",
    cursor: "default",
  };
}

const positionBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  marginRight: "var(--space-2)",
  borderRadius: "var(--radius-full)",
  backgroundColor: "var(--color-surface-elevated)",
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-xs)",
  fontWeight: "var(--font-weight-semibold)",
};
