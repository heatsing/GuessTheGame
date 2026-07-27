import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EmojiPuzzle } from "@/lib/content/schemas";

// --- Mocks ---------------------------------------------------------------
// Mirror the KeywordsGame mock pattern. vi.hoisted() avoids the vi.mock
// hoisting trap (ReferenceError: Cannot access before initialization).

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

import { EmojiGame } from "./EmojiGame";

// --- Fixtures ------------------------------------------------------------

const PUZZLE: EmojiPuzzle = {
  id: "em-001",
  mode: "emoji",
  domain: "geography",
  target: "Moon",
  aliases: ["luna"],
  fact: "The Moon is Earth's natural satellite.",
  emojis: ["🌙", "🌕", "🌑"],
  hints: { category: "celestial", firstLetter: "m" },
};

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

describe("EmojiGame — initial render", () => {
  it("shows all emojis upfront (the puzzle itself)", () => {
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);
    // All 3 emojis joined with spaces are shown.
    expect(screen.getByText("🌙 🌕 🌑")).toBeInTheDocument();
  });

  it("shows both hints as hidden initially", () => {
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);
    expect(screen.getByText("Category hint hidden")).toBeInTheDocument();
    expect(screen.getByText("First-letter hint hidden")).toBeInTheDocument();
  });

  it("disables the hint button after both hints are used", () => {
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);
    const hintBtn = screen.getByRole("button", { name: /Use hint/ });
    expect(hintBtn).not.toBeDisabled();
    expect(hintBtn).toHaveTextContent("0/2");
  });

  it("disables the submit button when the guess is empty", () => {
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);
    expect(screen.getByRole("button", { name: "Submit guess" })).toBeDisabled();
  });
});

describe("EmojiGame — correct guess", () => {
  it("accepts the correct target and records a solved result", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Moon");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // Score: 100 - 0 wrong - 0 hints = 100.
    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-21", "emoji", {
      puzzleId: "em-001",
      score: 100,
      revealedClues: 0,
      wrongGuesses: [],
      status: "solved",
    });

    expect(screen.getByText("100", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Moon", { selector: "strong" })).toBeInTheDocument();
  });

  it("accepts an alias as a correct guess", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "luna"); // alias
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith(
      "2026-07-21",
      "emoji",
      expect.objectContaining({ status: "solved" }),
    );
  });

  it("is case-insensitive when matching the target", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "MOON");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith(
      "2026-07-21",
      "emoji",
      expect.objectContaining({ status: "solved" }),
    );
  });
});

describe("EmojiGame — wrong guess", () => {
  it("records a wrong guess and announces it without ending the round", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Sun");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).not.toHaveBeenCalled();

    const wrongList = screen.getByLabelText("Previous wrong guesses");
    expect(wrongList.textContent).toContain("sun");
    expect(input).toHaveValue("");
  });

  it("de-duplicates case-variant wrong guesses", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Sun");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.type(input, "SUN");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.type(input, "sun");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    const wrongList = screen.getByLabelText("Previous wrong guesses");
    const chips = wrongList.querySelectorAll("span");
    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent).toBe("sun");
  });
});

describe("EmojiGame — hints", () => {
  it("reveals the category on first hint use (-25)", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    await user.click(screen.getByRole("button", { name: /Use hint/ }));

    expect(screen.getByText("celestial", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("First-letter hint hidden")).toBeInTheDocument();
  });

  it("reveals the first letter on second hint use (-25)", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const hintBtn = screen.getByRole("button", { name: /Use hint/ });
    await user.click(hintBtn);
    await user.click(hintBtn);

    // firstLetter is "m" → displayed as "M".
    expect(screen.getByText("M", { selector: "strong" })).toBeInTheDocument();
    expect(hintBtn).toBeDisabled();
  });

  it("cannot use more than 2 hints", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const hintBtn = screen.getByRole("button", { name: /Use hint/ });
    await user.click(hintBtn);
    await user.click(hintBtn);
    // Third click should be a no-op (button disabled).
    expect(hintBtn).toBeDisabled();
  });
});

describe("EmojiGame — give up", () => {
  it("ends the round with score 0 and records given_up status", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    await user.click(screen.getByRole("button", { name: "Give up" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-21", "emoji", {
      puzzleId: "em-001",
      score: 0,
      revealedClues: 0,
      wrongGuesses: [],
      status: "given_up",
    });

    expect(screen.getByText("Moon", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();
  });
});

describe("EmojiGame — scoring (integration with scoring engine)", () => {
  it("deducts 20 per wrong guess and 25 per hint", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    // 1 wrong guess (-20), 1 hint (-25). Score = 100 - 20 - 25 = 55.
    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Sun");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    await user.click(screen.getByRole("button", { name: /Use hint/ }));

    // Now solve.
    await user.type(input, "Moon");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-21", "emoji", {
      puzzleId: "em-001",
      score: 55,
      revealedClues: 1,
      wrongGuesses: ["sun"],
      status: "solved",
    });
  });

  it("deducts 50 for both hints (-25 each)", async () => {
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    // Use both hints (-50), no wrong guesses. Score = 100 - 50 = 50.
    const hintBtn = screen.getByRole("button", { name: /Use hint/ });
    await user.click(hintBtn);
    await user.click(hintBtn);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Moon");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-21", "emoji", {
      puzzleId: "em-001",
      score: 50,
      revealedClues: 2,
      wrongGuesses: [],
      status: "solved",
    });
  });
});

describe("EmojiGame — storage error handling", () => {
  it("shows a toast when recordModeResult throws (storage unavailable)", async () => {
    recordModeResultMock.mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Moon");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(showToastMock).toHaveBeenCalledWith(
      "Could not save progress (storage unavailable).",
      "error",
    );
    expect(screen.getByText("100", { selector: "strong" })).toBeInTheDocument();
  });

  it("shows an info toast when the result was already recorded (idempotent no-op)", async () => {
    recordModeResultMock.mockReturnValue({ changed: false, state: {} });
    const user = userEvent.setup();
    render(<EmojiGame puzzle={PUZZLE} utcDate="2026-07-21" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Moon");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(showToastMock).toHaveBeenCalledWith("Result already recorded.", "info");
  });
});
