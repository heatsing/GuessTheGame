import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// --- Mocks ---------------------------------------------------------------
// DailyChallenge reads localStorage via getProgress/getStreak (storage adapter)
// and renders ShareButton. We mock all three so the test exercises the
// dashboard's derived-state logic (totals, multiplier, completion, share text)
// without depending on real localStorage or the clipboard API.
//
// vi.mock factories are hoisted, so any variable they close over must be
// created with vi.hoisted() — otherwise the factory references the binding
// before initialization.

const { getProgressMock, getStreakMock, utcTodayMock, shareButtonMock } =
  vi.hoisted(() => ({
    getProgressMock: vi.fn(),
    getStreakMock: vi.fn(),
    utcTodayMock: vi.fn(),
    shareButtonMock: vi.fn(),
  }));

vi.mock("@/storage/actions", () => ({
  getProgress: getProgressMock,
  getStreak: getStreakMock,
}));

vi.mock("@/lib/game/utc", () => ({
  utcToday: utcTodayMock,
}));

vi.mock("./ShareButton", () => ({
  ShareButton: (props: { text: string; label: string }) => {
    shareButtonMock(props);
    return <button type="button">{props.label}</button>;
  },
}));

// Import AFTER mocks are registered.
import { DailyChallenge } from "./DailyChallenge";
import type { DailyProgress, StreakState } from "@/storage/types";

// --- Fixtures -------------------------------------------------------------

const TODAY = "2026-07-26";

const NO_STREAK: StreakState = {
  current: 0,
  max: 0,
  lastActiveDate: null,
};

const STREAK_7: StreakState = {
  current: 7,
  max: 12,
  lastActiveDate: "2026-07-25",
};

function modeProgress(
  status: "solved" | "given_up" | "in_progress",
  score: number,
): NonNullable<DailyProgress["kw"]> {
  return {
    puzzleId: `puzzle-${status}-${score}`,
    score,
    revealedClues: 0,
    wrongGuesses: [],
    status,
    updatedAt: "2026-07-26T12:00:00.000Z",
  };
}

// --- Setup ----------------------------------------------------------------

beforeEach(() => {
  getProgressMock.mockReset();
  getStreakMock.mockReset();
  utcTodayMock.mockReset();
  shareButtonMock.mockReset();

  utcTodayMock.mockReturnValue(TODAY);
  getStreakMock.mockReturnValue(NO_STREAK);
  getProgressMock.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

// --- Tests ----------------------------------------------------------------

describe("DailyChallenge — initial render (no progress)", () => {
  it("renders exactly 4 mode cards, one per mode", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("Keywords")).toBeInTheDocument();
    expect(screen.getByText("Emoji")).toBeInTheDocument();
    expect(screen.getByText("Screenshot")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("shows 'Play' status on every card when no progress exists", () => {
    render(<DailyChallenge />);
    // 4 cards, each with a "Play" badge.
    const playBadges = screen.getAllByText("Play");
    expect(playBadges).toHaveLength(4);
  });

  it("shows '0 of 4 puzzles resolved' and no share button", () => {
    render(<DailyChallenge />);
    expect(screen.getByText("0 of 4 puzzles resolved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Share/ })).not.toBeInTheDocument();
  });

  it("shows a hint to complete all four puzzles", () => {
    render(<DailyChallenge />);
    expect(
      screen.getByText(
        "Complete all four puzzles to unlock your final score and share.",
      ),
    ).toBeInTheDocument();
  });
});

describe("DailyChallenge — mode card links", () => {
  it("links each card to its /play/{mode} page", () => {
    render(<DailyChallenge />);
    const keywordsLink = screen.getByRole("link", {
      name: /Keywords — Play/,
    });
    const emojiLink = screen.getByRole("link", { name: /Emoji — Play/ });
    const screenshotLink = screen.getByRole("link", {
      name: /Screenshot — Play/,
    });
    const timelineLink = screen.getByRole("link", {
      name: /Timeline — Play/,
    });

    expect(keywordsLink).toHaveAttribute("href", "/play/keywords");
    expect(emojiLink).toHaveAttribute("href", "/play/emoji");
    expect(screenshotLink).toHaveAttribute("href", "/play/screenshot");
    expect(timelineLink).toHaveAttribute("href", "/play/timeline");
  });
});

describe("DailyChallenge — partial progress", () => {
  it("shows scores for solved modes and 'Play' for unsolved modes", () => {
    const progress: DailyProgress = {
      kw: modeProgress("solved", 80),
      em: modeProgress("solved", 60),
    };
    getProgressMock.mockReturnValue(progress);

    render(<DailyChallenge />);

    // Solved scores visible.
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    // 2 unsolved cards still show "Play".
    const playBadges = screen.getAllByText("Play");
    expect(playBadges).toHaveLength(2);
    // Solved cards show "Solved".
    expect(screen.getAllByText("Solved")).toHaveLength(2);
  });

  it("shows '2 of 4 puzzles resolved' and no share button", () => {
    const progress: DailyProgress = {
      kw: modeProgress("solved", 80),
      em: modeProgress("solved", 60),
    };
    getProgressMock.mockReturnValue(progress);

    render(<DailyChallenge />);
    expect(screen.getByText("2 of 4 puzzles resolved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Share/ })).not.toBeInTheDocument();
  });

  it("shows 'Given up' badge and score 0 for given_up modes", () => {
    const progress: DailyProgress = {
      kw: modeProgress("given_up", 0),
    };
    getProgressMock.mockReturnValue(progress);

    render(<DailyChallenge />);
    expect(screen.getByText("Given up")).toBeInTheDocument();
    // Score 0 is rendered on the card (given_up is a completed status). The
    // card's aria-label includes the score so we assert on that rather than
    // querying by text "0" (which also matches the streak counter).
    expect(
      screen.getByRole("link", { name: /Keywords — Given up \(0\/100\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 4 puzzles resolved")).toBeInTheDocument();
  });
});

describe("DailyChallenge — complete (all 4 resolved)", () => {
  it("shows daily total, multiplier, final score, and share button when all 4 are solved", () => {
    const progress: DailyProgress = {
      kw: modeProgress("solved", 90),
      em: modeProgress("solved", 80),
      ss: modeProgress("solved", 70),
      tl: modeProgress("solved", 60),
    };
    getProgressMock.mockReturnValue(progress);
    // Streak 7 → 1.20x multiplier (PRD §7.2).
    getStreakMock.mockReturnValue(STREAK_7);

    render(<DailyChallenge />);

    // 90 + 80 + 70 + 60 = 300.
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText(/\/ 400/)).toBeInTheDocument();
    // 1.20x appears twice: in the banner (streak display) and in the summary
    // (Streak multiplier line). Both are <strong> elements.
    expect(screen.getAllByText("1.20x")).toHaveLength(2);
    // 300 × 1.20 = 360 final.
    expect(screen.getByText("360")).toBeInTheDocument();
    expect(screen.getByText(/final score/)).toBeInTheDocument();
    // Share button appears.
    expect(
      screen.getByRole("button", { name: "Share today's result" }),
    ).toBeInTheDocument();
    // 4 of 4 resolved.
    expect(screen.getByText("4 of 4 puzzles resolved")).toBeInTheDocument();
  });

  it("treats all-given_up as complete (share button appears)", () => {
    const progress: DailyProgress = {
      kw: modeProgress("given_up", 0),
      em: modeProgress("given_up", 0),
      ss: modeProgress("given_up", 0),
      tl: modeProgress("given_up", 0),
    };
    getProgressMock.mockReturnValue(progress);

    render(<DailyChallenge />);
    // Total 0, final 0, but still complete.
    expect(screen.getByText("4 of 4 puzzles resolved")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Share today's result" }),
    ).toBeInTheDocument();
  });

  it("passes the correct share text to ShareButton", () => {
    const progress: DailyProgress = {
      kw: modeProgress("solved", 90),
      em: modeProgress("solved", 80),
      ss: modeProgress("solved", 70),
      tl: modeProgress("solved", 60),
    };
    getProgressMock.mockReturnValue(progress);
    getStreakMock.mockReturnValue(STREAK_7);

    render(<DailyChallenge />);

    expect(shareButtonMock).toHaveBeenCalledTimes(1);
    const props = shareButtonMock.mock.calls[0]![0] as { text: string };
    const text = props.text;
    // Header + date.
    expect(text).toContain("Guess the Game — Daily Challenge");
    expect(text).toContain(`Date: ${TODAY} (UTC)`);
    // Per-mode scores.
    expect(text).toContain("Keywords: 90");
    expect(text).toContain("Emoji: 80");
    expect(text).toContain("Screenshot: 70");
    expect(text).toContain("Timeline: 60");
    // Total line: 300 × 1.20x = 360.
    expect(text).toContain("Total: 300 × 1.20x = 360");
  });
});

describe("DailyChallenge — streak multiplier display", () => {
  it("shows 1.00x multiplier and streak 0 for a new player", () => {
    getStreakMock.mockReturnValue(NO_STREAK);
    render(<DailyChallenge />);
    // The streak counter "0" lives in a <strong> inside the banner. Use a
    // function matcher to target it specifically — a plain getByText("0")
    // is ambiguous because "0 of 4 puzzles resolved" also contains a "0"
    // text node in the summary <p>.
    expect(
      screen.getByText(
        (content, element) =>
          content === "0" && element?.tagName === "STRONG",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1.00x")).toBeInTheDocument();
  });

  it("shows 1.20x multiplier for a 7-day streak (PRD §7.2 boundary)", () => {
    getStreakMock.mockReturnValue(STREAK_7);
    render(<DailyChallenge />);
    // "7" only appears as the streak counter <strong> in this test (no
    // progress → summary shows "0 of 4"), so a plain text match is safe.
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("1.20x")).toBeInTheDocument();
  });

  it("shows 1.50x multiplier for a 10+ day streak", () => {
    getStreakMock.mockReturnValue({
      current: 15,
      max: 15,
      lastActiveDate: "2026-07-25",
    });
    render(<DailyChallenge />);
    expect(screen.getByText("1.50x")).toBeInTheDocument();
  });
});

describe("DailyChallenge — today date display", () => {
  it("displays today's UTC date in the banner", () => {
    utcTodayMock.mockReturnValue("2026-03-15");
    render(<DailyChallenge />);
    expect(screen.getByText("Today (UTC): 2026-03-15")).toBeInTheDocument();
  });
});
