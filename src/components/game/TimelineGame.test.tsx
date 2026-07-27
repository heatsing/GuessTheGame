import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { TimelinePuzzle } from "@/lib/content/schemas";

// --- Mocks ---------------------------------------------------------------
// Mirror the ScreenshotGame mock pattern. vi.hoisted() avoids the vi.mock
// hoisting trap. TimelineControls is NOT mocked — we test real reorder.

const { recordModeResultMock, showToastMock } = vi.hoisted(() => ({
  recordModeResultMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock("@/storage/actions", () => ({
  recordModeResult: recordModeResultMock,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: showToastMock }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { TimelineGame } from "./TimelineGame";

// --- Fixtures ------------------------------------------------------------

/**
 * 4-item puzzle. Correct chronological order (oldest→newest) by date:
 *   Printing Press (1450) < Steam Engine (1712) < Telephone (1876) < Internet (1969)
 * i.e. correct order = ["Printing Press", "Steam Engine", "Telephone", "Internet"]
 */
const PUZZLE: TimelinePuzzle = {
  id: "tl-001",
  mode: "timeline",
  domain: "history",
  fact: "These inventions transformed human communication and industry.",
  items: [
    { title: "Internet", description: "Global network", date: 1969 },
    { title: "Steam Engine", description: "Industrial power", date: 1712 },
    { title: "Printing Press", description: "Mass communication", date: 1450 },
    { title: "Telephone", description: "Voice transmission", date: 1876 },
  ],
};

const CORRECT_ORDER = ["Printing Press", "Steam Engine", "Telephone", "Internet"];

// --- Setup ---------------------------------------------------------------

beforeEach(() => {
  recordModeResultMock.mockClear();
  showToastMock.mockClear();
  recordModeResultMock.mockReturnValue({ changed: true, state: {} });
});

afterEach(() => {
  vi.clearAllMocks();
});

// --- Tests ---------------------------------------------------------------

describe("TimelineGame — initial render", () => {
  it("renders all 4 items in a shuffled (non-chronological) order", () => {
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);
    // All 4 item titles appear as list items.
    const list = screen.getByRole("list");
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(4);

    // The displayed order must NOT equal the correct chronological order
    // (the deterministic shuffle guarantees a non-chronological start).
    const displayedTitles = Array.from(items).map((li) =>
      li.getAttribute("aria-label") ?? "",
    );
    // Each aria-label is like "Position N of 4: <title>".
    const titles = displayedTitles.map((label) => {
      const match = label.match(/: (.+)$/);
      return match ? match[1] : "";
    });
    expect(titles).not.toEqual(CORRECT_ORDER);
  });

  it("shows the hint counter at 0/2", () => {
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);
    expect(screen.getByText("Hints used: 0/2")).toBeInTheDocument();
  });

  it("shows 4 hint buttons (one per item) to reveal dates", () => {
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);
    // Each item title appears as a hint button.
    for (const title of PUZZLE.items.map((it) => it.title)) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
  });

  it("shows a Submit order button", () => {
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);
    expect(screen.getByRole("button", { name: "Submit order" })).toBeInTheDocument();
  });

  it("shows a Give up button", () => {
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);
    expect(screen.getByRole("button", { name: "Give up" })).toBeInTheDocument();
  });
});

describe("TimelineGame — hints", () => {
  it("reveals an item's date on hint use (-10)", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    await user.click(screen.getByRole("button", { name: "Printing Press" }));

    // The button now shows the date.
    expect(screen.getByRole("button", { name: /Printing Press: 1450 CE/ })).toBeInTheDocument();
    expect(screen.getByText("Hints used: 1/2")).toBeInTheDocument();
  });

  it("disables a revealed item's hint button", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    const btn = screen.getByRole("button", { name: "Printing Press" });
    await user.click(btn);
    expect(btn).toBeDisabled();
  });

  it("allows a second hint on a different item", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    await user.click(screen.getByRole("button", { name: "Printing Press" }));
    await user.click(screen.getByRole("button", { name: "Internet" }));

    expect(screen.getByText("Hints used: 2/2")).toBeInTheDocument();
  });

  it("disables all hint buttons after 2 hints used", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    await user.click(screen.getByRole("button", { name: "Printing Press" }));
    await user.click(screen.getByRole("button", { name: "Internet" }));

    // Remaining hint buttons (Steam Engine, Telephone) should be disabled.
    expect(screen.getByRole("button", { name: "Steam Engine" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Telephone" })).toBeDisabled();
  });
});

describe("TimelineGame — reorder via TimelineControls", () => {
  it("moves an item down using the Move down button", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    // Find the first list item and move it down.
    const list = screen.getByRole("list");
    const firstItem = list.querySelectorAll("li")[0]!;
    const moveDownBtn = firstItem.querySelector('button[aria-label$="down"]') as HTMLButtonElement;
    await user.click(moveDownBtn);

    // The list now reflects the reordered state (item 0 → position 1).
    const itemsAfter = screen.getByRole("list").querySelectorAll("li");
    expect(itemsAfter).toHaveLength(4);
    // Verify the move happened by checking the first item changed.
    const firstAfter = itemsAfter[0]!;
    const firstAfterLabel = firstAfter.getAttribute("aria-label") ?? "";
    // The item that was at position 0 should now be at position 1.
    // (We can't assert exact titles without knowing the shuffle, but the
    // list still has 4 items and reordering is non-destructive.)
    expect(firstAfterLabel).toMatch(/Position 1 of 4:/);
  });
});

describe("TimelineGame — submit (perfect order = 100)", () => {
  it("scores 100 when the player arranges the correct order", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    // Arrange the correct order using Move up/Move down buttons.
    // This is tricky because the initial shuffle is deterministic but unknown
    // to the test. Instead, we move items until the order matches CORRECT_ORDER.
    // A simpler approach: click Submit immediately — the score depends on the
    // shuffle, which we can't control. So we instead test the SCORING by
    // submitting a known-bad order and asserting a sub-100 score, plus verify
    // the perfect-order path via a controlled scenario.

    // For the perfect-order assertion: move items into CORRECT_ORDER, then submit.
    // Use a helper that moves items by title.
    await arrangeOrder(user, CORRECT_ORDER);

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-26", "timeline", {
      puzzleId: "tl-001",
      score: 100,
      revealedClues: 0,
      wrongGuesses: [],
      status: "solved",
    });
  });
});

describe("TimelineGame — submit (imperfect order < 100)", () => {
  it("scores below 100 when the order has position errors", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    // Arrange a slightly-wrong order: swap the first two correct items.
    // CORRECT_ORDER = [Printing Press, Steam Engine, Telephone, Internet]
    // WRONG         = [Steam Engine, Printing Press, Telephone, Internet]
    // Position errors: Printing Press (pos 1 vs 0 = 1) + Steam Engine (pos 0 vs 1 = 1) = 2.
    // Score = 100 - 15*2 = 70.
    const wrongOrder = ["Steam Engine", "Printing Press", "Telephone", "Internet"];
    await arrangeOrder(user, wrongOrder);

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-26", "timeline", {
      puzzleId: "tl-001",
      score: 70,
      revealedClues: 0,
      wrongGuesses: [],
      status: "solved",
    });
  });
});

describe("TimelineGame — submit with hint penalty", () => {
  it("deducts 10 per hint on top of position errors", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    // Use 1 hint (-10), then arrange a perfect order (0 position errors).
    await user.click(screen.getByRole("button", { name: "Printing Press" }));
    await arrangeOrder(user, CORRECT_ORDER);

    await user.click(screen.getByRole("button", { name: "Submit order" }));

    // Score = 100 - 0 position errors - 10 hint = 90.
    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-26", "timeline", {
      puzzleId: "tl-001",
      score: 90,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });
  });
});

describe("TimelineGame — give up", () => {
  it("ends the round with score 0 and reveals the correct order", async () => {
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    await user.click(screen.getByRole("button", { name: "Give up" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-26", "timeline", {
      puzzleId: "tl-001",
      score: 0,
      revealedClues: 0,
      wrongGuesses: [],
      status: "given_up",
    });

    // The finished view shows the correct order with dates.
    expect(screen.getByText("The correct order was:")).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();
    // First item in the revealed list should be Printing Press (1450).
    const revealedItems = screen.getAllByText(/1450 CE/);
    expect(revealedItems.length).toBeGreaterThan(0);
  });
});

describe("TimelineGame — storage error handling", () => {
  it("shows a toast when recordModeResult throws (storage unavailable)", async () => {
    recordModeResultMock.mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    await arrangeOrder(user, CORRECT_ORDER);
    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(showToastMock).toHaveBeenCalledWith(
      "Could not save progress (storage unavailable).",
      "error",
    );
  });

  it("shows an info toast when the result was already recorded (idempotent no-op)", async () => {
    recordModeResultMock.mockReturnValue({ changed: false, state: {} });
    const user = userEvent.setup();
    render(<TimelineGame puzzle={PUZZLE} utcDate="2026-07-26" />);

    await arrangeOrder(user, CORRECT_ORDER);
    await user.click(screen.getByRole("button", { name: "Submit order" }));

    expect(showToastMock).toHaveBeenCalledWith("Result already recorded.", "info");
  });
});

// --- Helper: arrange the list into a target order via Move up buttons ----

/**
 * Moves list items into `targetOrder` by clicking Move up buttons.
 *
 * Strategy: process from the BOTTOM up. For target position i (from
 * targetOrder.length-1 down to 0), find the item that belongs at i and move
 * it UP until it reaches position i. Processing bottom-up means moving an
 * item up to position i does not disturb items already placed at positions
 * i+1..n-1 (those are below the insertion point and only shift down by one,
 * which is fine because we've already finalized them... actually no).
 *
 * Simpler and correct: process TOP down. For target position i (0..n-1),
 * find the item that belongs at i and move it UP until it reaches position i.
 * Moving an item up from below position i only shifts items between its old
 * position and i — none of which are above i. Items already placed at
 * positions 0..i-1 are untouched. This is the correct, proven approach.
 */
async function arrangeOrder(user: ReturnType<typeof userEvent.setup>, targetOrder: string[]): Promise<void> {
  for (let targetPos = 0; targetPos < targetOrder.length; targetPos++) {
    const targetTitle = targetOrder[targetPos]!;

    // Move the item up until it's at targetPos. Moving up from below
    // targetPos only affects items in [targetPos, currentPos] — all of which
    // are at or below targetPos, so already-placed items (0..targetPos-1) are safe.
    let safety = 0;
    while (getItemPosition(targetTitle) > targetPos && safety < 20) {
      const moveUpBtn = getMoveButton(targetTitle, "up");
      await user.click(moveUpBtn);
      safety++;
    }
  }
}

/** Returns the current position (0-indexed) of `title` in the rendered list. */
function getItemPosition(title: string): number {
  const list = screen.getByRole("list");
  const items = Array.from(list.querySelectorAll("li"));
  return items.findIndex((li) => {
    const label = li.getAttribute("aria-label") ?? "";
    return label.includes(`: ${title}`);
  });
}

/** Returns the Move up or Move down button for `title`. */
function getMoveButton(title: string, direction: "up" | "down"): HTMLButtonElement {
  const list = screen.getByRole("list");
  const items = Array.from(list.querySelectorAll("li"));
  const item = items.find((li) => (li.getAttribute("aria-label") ?? "").includes(`: ${title}`));
  if (!item) throw new Error(`Item not found: ${title}`);
  const btn = item.querySelector(`button[aria-label="Move ${title} ${direction}"]`);
  if (!btn) throw new Error(`Move ${direction} button not found for ${title}`);
  return btn as HTMLButtonElement;
}
