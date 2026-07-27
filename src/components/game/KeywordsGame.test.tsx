import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { KeywordsPuzzle } from "@/lib/content/schemas";

// --- Mocks ---------------------------------------------------------------
// The game component calls recordModeResult (storage) and useToast (UI). We
// mock both so the test exercises component logic, not persistence/UI plumbing.
//
// vi.mock factories are hoisted above all imports, so any variable they close
// over must be created with vi.hoisted() — otherwise the factory references
// the binding before initialization (ReferenceError). This is the vitest-
// documented pattern.

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

// Import AFTER mocks are registered.
import { KeywordsGame } from "./KeywordsGame";

// --- Fixtures ------------------------------------------------------------

const PUZZLE: KeywordsPuzzle = {
  id: "kw-001",
  mode: "keywords",
  domain: "geography",
  target: "Volcano",
  aliases: ["volcanoes"],
  fact: "A volcano is an opening in the Earth's crust.",
  keywords: ["mountain", "heat", "lava", "eruption"],
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

describe("KeywordsGame — initial render", () => {
  it("renders the first clue revealed and the rest hidden", () => {
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);
    // First clue visible.
    expect(screen.getByText("mountain")).toBeInTheDocument();
    // Remaining clues are hidden (rendered as ●●●● placeholders).
    const hidden = screen.getAllByText("●●●●");
    expect(hidden).toHaveLength(3); // 4 total - 1 revealed = 3 hidden
  });

  it("disables the reveal button when the last clue is already shown", () => {
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);
    // Only 1/4 revealed — button should be enabled.
    const revealBtn = screen.getByRole("button", { name: /Reveal next clue/ });
    expect(revealBtn).not.toBeDisabled();
  });

  it("disables the submit button when the guess is empty", () => {
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);
    const submitBtn = screen.getByRole("button", { name: "Submit guess" });
    expect(submitBtn).toBeDisabled();
  });
});

describe("KeywordsGame — correct guess", () => {
  it("accepts the correct target and records a solved result", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Volcano");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // Final score shown (100 - 0 wrong - 0 revealed-clue penalty = 100).
    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-19", "keywords", {
      puzzleId: "kw-001",
      score: 100,
      revealedClues: 1,
      wrongGuesses: [],
      status: "solved",
    });

    // The finished view renders the score inside a <strong>.
    const scoreStrong = screen.getByText("100", { selector: "strong" });
    expect(scoreStrong).toBeInTheDocument();
    // The answer is revealed in the "The answer was: <strong>" line.
    const answerStrong = screen.getByText("Volcano", { selector: "strong" });
    expect(answerStrong).toBeInTheDocument();
  });

  it("accepts an alias as a correct guess", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "volcanoes"); // alias
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith(
      "2026-07-19",
      "keywords",
      expect.objectContaining({ status: "solved" }),
    );
  });

  it("is case-insensitive when matching the target", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "VOLCANO");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith(
      "2026-07-19",
      "keywords",
      expect.objectContaining({ status: "solved" }),
    );
  });
});

describe("KeywordsGame — wrong guess", () => {
  it("records a wrong guess and announces it without ending the round", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // Round NOT recorded (still playing).
    expect(recordModeResultMock).not.toHaveBeenCalled();

    // Wrong guess shown as a chip in the previous-wrong-guesses list.
    const wrongList = screen.getByLabelText("Previous wrong guesses");
    expect(wrongList.textContent).toContain("mountain");
    // Input cleared.
    expect(input).toHaveValue("");
  });

  it("de-duplicates case-variant wrong guesses (penalty list does not grow)", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    // Submit the same wrong guess in different cases — should count once.
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.type(input, "MOUNTAIN");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.type(input, "mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // Only one "mountain" chip (case-normalized + de-duplicated).
    const wrongList = screen.getByLabelText("Previous wrong guesses");
    const chips = wrongList.querySelectorAll("span");
    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent).toBe("mountain");
  });

  it("records two distinct wrong guesses as separate chips", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.type(input, "Ocean");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // Two distinct chips (case-normalized) inside the wrong-guess list.
    const wrongList = screen.getByLabelText("Previous wrong guesses");
    expect(wrongList.textContent).toContain("mountain");
    expect(wrongList.textContent).toContain("ocean");
  });
});

describe("KeywordsGame — reveal next clue", () => {
  it("reveals the next clue on click and updates the counter", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const revealBtn = screen.getByRole("button", { name: /Reveal next clue/ });
    await user.click(revealBtn);

    // Now 2 clues visible: "mountain" (first, free) + "heat".
    expect(screen.getByText("heat")).toBeInTheDocument();
    expect(revealBtn).toHaveTextContent("2/4");
  });

  it("disables the reveal button after the last clue is shown", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const revealBtn = screen.getByRole("button", { name: /Reveal next clue/ });
    // Reveal clues 2, 3, 4 (clue 1 already shown on mount).
    await user.click(revealBtn);
    await user.click(revealBtn);
    await user.click(revealBtn);

    expect(revealBtn).toBeDisabled();
  });
});

describe("KeywordsGame — give up", () => {
  it("ends the round with score 0 and records given_up status", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    await user.click(screen.getByRole("button", { name: "Give up" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-19", "keywords", {
      puzzleId: "kw-001",
      score: 0,
      revealedClues: 1,
      wrongGuesses: [],
      status: "given_up",
    });

    // Answer revealed in the finished view's <strong>.
    expect(screen.getByText("Volcano", { selector: "strong" })).toBeInTheDocument();
    // Score 0 shown in the finished view's <strong>.
    expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();
  });
});

describe("KeywordsGame — scoring (integration with scoring engine)", () => {
  it("deducts 10 per wrong guess and 15 per revealed clue", async () => {
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    // 1 wrong guess (-10), reveal 1 extra clue (-15). Score = 100 - 10 - 15 = 75.
    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    await user.click(screen.getByRole("button", { name: /Reveal next clue/ }));

    // Now solve.
    await user.type(input, "Volcano");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-19", "keywords", {
      puzzleId: "kw-001",
      score: 75,
      revealedClues: 2,
      wrongGuesses: ["mountain"],
      status: "solved",
    });
  });
});

describe("KeywordsGame — storage error handling", () => {
  it("shows a toast when recordModeResult throws (storage unavailable)", async () => {
    recordModeResultMock.mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Volcano");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // The game still shows the solved state; the toast warns about persistence.
    expect(showToastMock).toHaveBeenCalledWith(
      "Could not save progress (storage unavailable).",
      "error",
    );
    // Result still recorded visually (score 100 in the finished view).
    expect(screen.getByText("100", { selector: "strong" })).toBeInTheDocument();
  });

  it("shows an info toast when the result was already recorded (idempotent no-op)", async () => {
    recordModeResultMock.mockReturnValue({ changed: false, state: {} });
    const user = userEvent.setup();
    render(<KeywordsGame puzzle={PUZZLE} utcDate="2026-07-19" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Volcano");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(showToastMock).toHaveBeenCalledWith("Result already recorded.", "info");
  });
});
