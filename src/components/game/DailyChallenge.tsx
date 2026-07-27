"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getProgress, getStreak } from "@/storage/actions";
import type { DailyProgress, StreakState, UtcDate } from "@/storage/types";
import {
  computeDailyTotal,
  finalDailyScore,
  streakMultiplier,
} from "@/lib/game/scoring";
import { utcToday } from "@/lib/game/utc";
import { ShareButton } from "./ShareButton";

/**
 * Daily Mixed Challenge dashboard (PRD §5.1, §7.2).
 *
 * Shows one card per mode (Keywords / Emoji / Screenshot / Timeline) with the
 * player's progress for today's UTC date. Each card links to the mode's native
 * play page (`/play/{mode}`), which serves the same daily puzzle via
 * `selectDailyPuzzleForMode`. Once all four puzzles are resolved (solved or
 * given_up), the daily total, streak multiplier, final score, and share button
 * appear.
 *
 * SSR/hydration: `progress` and `streak` start as `undefined` / defaults on
 * both server and client first-render (localStorage is only readable in the
 * browser, inside `useEffect`). The static shell — mode names, descriptions,
 * links — renders identically on both sides; only the progress-dependent
 * values (status badge, score, total) fill in after mount. No hydration
 * mismatch.
 *
 * No localStorage calls in this component (guardrail #9) — all reads go
 * through `getProgress` / `getStreak` in `src/storage/actions.ts`.
 */

// --- Mode card definitions ------------------------------------------------

interface ModeCardDef {
  /** Short key inside `DailyProgress` (kept short for JSON size). */
  key: "kw" | "em" | "ss" | "tl";
  mode: "keywords" | "emoji" | "screenshot" | "timeline";
  name: string;
  href: string;
  description: string;
}

const MODE_CARDS: ModeCardDef[] = [
  {
    key: "kw",
    mode: "keywords",
    name: "Keywords",
    href: "/play/keywords",
    description: "Guess the word from keyword clues.",
  },
  {
    key: "em",
    mode: "emoji",
    name: "Emoji",
    href: "/play/emoji",
    description: "Guess from an emoji sequence.",
  },
  {
    key: "ss",
    mode: "screenshot",
    name: "Screenshot",
    href: "/play/screenshot",
    description: "Identify the sharpened image.",
  },
  {
    key: "tl",
    mode: "timeline",
    name: "Timeline",
    href: "/play/timeline",
    description: "Arrange items chronologically.",
  },
];

// --- Status helpers -------------------------------------------------------

type CardStatus = "not_started" | "in_progress" | "solved" | "given_up";

function cardStatus(
  progress: DailyProgress | undefined,
  key: ModeCardDef["key"],
): CardStatus {
  if (!progress) return "not_started";
  const entry = progress[key];
  if (!entry) return "not_started";
  return entry.status;
}

function isCompleted(status: CardStatus): boolean {
  return status === "solved" || status === "given_up";
}

function statusLabel(status: CardStatus): string {
  switch (status) {
    case "not_started":
      return "Play";
    case "in_progress":
      return "Resume";
    case "solved":
      return "Solved";
    case "given_up":
      return "Given up";
  }
}

function formatMultiplier(mult: number): string {
  // 1.00x, 1.05x, 1.10x, 1.20x, 1.50x — always 2 decimals for alignment.
  return `${mult.toFixed(2)}x`;
}

// --- Component ------------------------------------------------------------

export function DailyChallenge() {
  const [progress, setProgress] = useState<DailyProgress | undefined>(undefined);
  const [streak, setStreak] = useState<StreakState>({
    current: 0,
    max: 0,
    lastActiveDate: null,
  });
  const [today, setToday] = useState<UtcDate>("");

  useEffect(() => {
    const t = utcToday();
    setToday(t);
    setProgress(getProgress(t));
    setStreak(getStreak());
  }, []);

  // Derived state. Before mount, `progress` is undefined → all cards render
  // as "not_started" and totals are 0. After mount, real values fill in.
  const dailyTotal = computeDailyTotal({
    keywords: progress?.kw?.score,
    emoji: progress?.em?.score,
    screenshot: progress?.ss?.score,
    timeline: progress?.tl?.score,
  });

  const multiplier = streakMultiplier(streak.current);
  const finalScore = finalDailyScore(dailyTotal, multiplier);

  const completedCount = MODE_CARDS.filter((m) =>
    isCompleted(cardStatus(progress, m.key)),
  ).length;
  const isComplete = completedCount === MODE_CARDS.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* --- Date + streak banner --------------------------------------- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--space-3)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {today ? `Today (UTC): ${today}` : "\u00A0"}
        </p>
        <p
          style={{
            margin: 0,
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Current streak: <strong>{streak.current}</strong> day
          {streak.current === 1 ? "" : "s"} · Multiplier{" "}
          <strong>{formatMultiplier(multiplier)}</strong>
        </p>
      </div>

      {/* --- Mode cards -------------------------------------------------- */}
      <div
        aria-label="Daily challenge puzzles"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {MODE_CARDS.map((m) => {
          const status = cardStatus(progress, m.key);
          const score = progress?.[m.key]?.score;
          const done = isCompleted(status);
          return (
            <Link
              key={m.key}
              href={m.href}
              className="gtg-card gtg-card-interactive"
              style={{
                display: "block",
                textDecoration: "none",
                color: "var(--color-text)",
              }}
              aria-label={`${m.name} — ${statusLabel(status)}${
                done && score != null ? ` (${score}/100)` : ""
              }`}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--space-2)",
                }}
              >
                <h3
                  style={{
                    fontSize: "var(--font-size-lg)",
                    margin: 0,
                  }}
                >
                  {m.name}
                </h3>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: done
                      ? "var(--color-success-bg)"
                      : "var(--color-surface)",
                    color: done
                      ? "var(--color-success)"
                      : "var(--color-text-muted)",
                    border: done
                      ? "1px solid var(--color-success)"
                      : "1px solid var(--color-border)",
                  }}
                >
                  {statusLabel(status)}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-sm)",
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                {m.description}
              </p>
              {done && score != null && (
                <p
                  style={{
                    margin: "var(--space-2) 0 0",
                    fontSize: "var(--font-size-2xl)",
                    fontWeight: "var(--font-weight-bold)",
                  }}
                >
                  {score}
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-regular)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {" "}
                    / 100
                  </span>
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {/* --- Progress + total + share ----------------------------------- */}
      <section
        aria-label="Daily challenge summary"
        className="gtg-card"
        style={{ textAlign: "center" }}
      >
        <p
          style={{
            margin: 0,
            marginBottom: "var(--space-3)",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {completedCount} of {MODE_CARDS.length} puzzles resolved
        </p>

        {isComplete ? (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                marginBottom: "var(--space-4)",
              }}
            >
              <p style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
                Daily total: <strong>{dailyTotal}</strong> / 400
              </p>
              <p style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
                Streak multiplier: <strong>{formatMultiplier(multiplier)}</strong>
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-bold)",
                }}
              >
                {finalScore}
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-regular)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {" "}
                  final score
                </span>
              </p>
            </div>
            <ShareButton
              text={buildShareText(today, progress, dailyTotal, multiplier, finalScore)}
              url={typeof window !== "undefined" ? window.location.href : undefined}
              title="Guess the Game — Daily Challenge result"
              label="Share today's result"
            />
          </>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-muted)",
            }}
          >
            Complete all four puzzles to unlock your final score and share.
          </p>
        )}
      </section>
    </div>
  );
}

// --- Share text builder ---------------------------------------------------

/**
 * Builds the share payload (PRD §8.1 US-5). Plain-text so it pastes cleanly
 * into any chat app. Mode scores are omitted when the mode has no record yet;
 * given_up scores show as 0.
 */
function buildShareText(
  today: string,
  progress: DailyProgress | undefined,
  dailyTotal: number,
  multiplier: number,
  finalScore: number,
): string {
  const lines: string[] = [];
  lines.push("Guess the Game — Daily Challenge");
  if (today) lines.push(`Date: ${today} (UTC)`);
  lines.push("");

  for (const m of MODE_CARDS) {
    const entry = progress?.[m.key];
    const score = entry?.score ?? "—";
    lines.push(`${m.name}: ${score}`);
  }

  lines.push("");
  lines.push(`Total: ${dailyTotal} × ${formatMultiplier(multiplier)} = ${finalScore}`);
  return lines.join("\n");
}
