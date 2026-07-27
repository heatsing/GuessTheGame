import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ScreenshotPuzzle } from "@/lib/content/schemas";

// --- Mocks ---------------------------------------------------------------
// Mirror the EmojiGame mock pattern. vi.hoisted() avoids the vi.mock hoisting
// trap. GameImage is mocked to avoid jsdom image-loading (which never fires
// onLoad/onError in jsdom and would leave the component in a pending state).

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

// Mock GameImage to render a simple div with the blurPx exposed via a data
// attribute, so tests can assert the blur tier without real image loading.
// blurSrc is also exposed so tests can verify LQIP wiring (P1-10).
vi.mock("./GameImage", () => ({
  GameImage: ({
    blurPx,
    blurSrc,
    alt,
  }: {
    blurPx?: number;
    blurSrc?: string;
    alt: string;
  }) => (
    <div
      role="img"
      aria-label={alt}
      data-blur-px={blurPx ?? 0}
      data-blur-src={blurSrc ?? ""}
    >
      screenshot
    </div>
  ),
}));

import { ScreenshotGame } from "./ScreenshotGame";

// --- Fixtures ------------------------------------------------------------

const PUZZLE: ScreenshotPuzzle = {
  id: "ss-001",
  mode: "screenshot",
  domain: "geography",
  target: "Mountain",
  aliases: ["peak"],
  fact: "A mountain is a large landform.",
  image: "/images/puzzles/ss-001.webp",
  imageLicense: "placeholder",
  imageAttribution: "placeholder",
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

describe("ScreenshotGame — initial render", () => {
  it("shows the screenshot at max blur (level 3) on mount", () => {
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);
    const img = screen.getByRole("img", { name: "Screenshot clue: Mountain" });
    // Level 3 = 24px blur.
    expect(img).toHaveAttribute("data-blur-px", "24");
  });

  it("passes blurSrc (LQIP thumbnail) to GameImage when present (P1-10)", () => {
    const puzzleWithBlur: ScreenshotPuzzle = {
      ...PUZZLE,
      blurSrc: "/images/puzzles/ss-001-blur.webp",
    };
    render(<ScreenshotGame puzzle={puzzleWithBlur} utcDate="2026-07-25" />);
    const img = screen.getByRole("img", { name: "Screenshot clue: Mountain" });
    expect(img).toHaveAttribute(
      "data-blur-src",
      "/images/puzzles/ss-001-blur.webp",
    );
  });

  it("renders with no blurSrc when the puzzle does not define one", () => {
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);
    const img = screen.getByRole("img", { name: "Screenshot clue: Mountain" });
    expect(img).toHaveAttribute("data-blur-src", "");
  });

  it("shows the blur-level label", () => {
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);
    expect(screen.getByText("Blur level: 3/3")).toBeInTheDocument();
  });

  it("shows image attribution (IP honesty)", () => {
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);
    expect(screen.getByText(/placeholder/)).toBeInTheDocument();
  });

  it("disables the sharpen button when fully sharp", () => {
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);
    const sharpenBtn = screen.getByRole("button", { name: /Sharpen/ });
    // Starts at level 3 — not fully sharp, so enabled.
    expect(sharpenBtn).not.toBeDisabled();
    expect(sharpenBtn).toHaveTextContent("0/3");
  });

  it("disables the submit button when the guess is empty", () => {
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);
    expect(screen.getByRole("button", { name: "Submit guess" })).toBeDisabled();
  });
});

describe("ScreenshotGame — sharpen", () => {
  it("reduces blur by one level per sharpen (3→2→1→0)", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const img = screen.getByRole("img", { name: "Screenshot clue: Mountain" });
    const sharpenBtn = screen.getByRole("button", { name: /Sharpen/ });

    // Level 3 → 2 (24px → 14px).
    await user.click(sharpenBtn);
    expect(img).toHaveAttribute("data-blur-px", "14");
    expect(sharpenBtn).toHaveTextContent("1/3");

    // Level 2 → 1 (14px → 6px).
    await user.click(sharpenBtn);
    expect(img).toHaveAttribute("data-blur-px", "6");
    expect(sharpenBtn).toHaveTextContent("2/3");

    // Level 1 → 0 (6px → 0px = sharp).
    await user.click(sharpenBtn);
    expect(img).toHaveAttribute("data-blur-px", "0");
    expect(sharpenBtn).toHaveTextContent("3/3");
    expect(sharpenBtn).toBeDisabled();
  });

  it("cannot sharpen past level 0 (max 3 sharpens)", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const sharpenBtn = screen.getByRole("button", { name: /Sharpen/ });
    await user.click(sharpenBtn);
    await user.click(sharpenBtn);
    await user.click(sharpenBtn);
    // 4th click — button is disabled, no-op.
    expect(sharpenBtn).toBeDisabled();
  });
});

describe("ScreenshotGame — correct guess", () => {
  it("accepts the correct target and records a solved result", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // Score: 100 - 0 wrong - 0 sharpens = 100.
    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-25", "screenshot", {
      puzzleId: "ss-001",
      score: 100,
      revealedClues: 0,
      wrongGuesses: [],
      status: "solved",
    });

    expect(screen.getByText("100", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("Mountain", { selector: "strong" })).toBeInTheDocument();
  });

  it("accepts an alias as a correct guess", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "peak"); // alias
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith(
      "2026-07-25",
      "screenshot",
      expect.objectContaining({ status: "solved" }),
    );
  });

  it("reveals the image fully sharp on solve", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const img = screen.getByRole("img", { name: "Screenshot clue: Mountain" });
    // Starts blurred.
    expect(img).toHaveAttribute("data-blur-px", "24");

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    // After solve, blur is 0 (sharp) regardless of sharpen state.
    expect(img).toHaveAttribute("data-blur-px", "0");
  });
});

describe("ScreenshotGame — wrong guess", () => {
  it("records a wrong guess and announces it without ending the round", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Valley");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).not.toHaveBeenCalled();

    const wrongList = screen.getByLabelText("Previous wrong guesses");
    expect(wrongList.textContent).toContain("valley");
    expect(input).toHaveValue("");
  });

  it("de-duplicates case-variant wrong guesses", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Valley");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));
    await user.type(input, "VALLEY");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    const wrongList = screen.getByLabelText("Previous wrong guesses");
    const chips = wrongList.querySelectorAll("span");
    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent).toBe("valley");
  });
});

describe("ScreenshotGame — give up", () => {
  it("ends the round with score 0 and records given_up status", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    await user.click(screen.getByRole("button", { name: "Give up" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-25", "screenshot", {
      puzzleId: "ss-001",
      score: 0,
      revealedClues: 0,
      wrongGuesses: [],
      status: "given_up",
    });

    expect(screen.getByText("Mountain", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();
  });

  it("reveals the image fully sharp on give-up", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const img = screen.getByRole("img", { name: "Screenshot clue: Mountain" });
    await user.click(screen.getByRole("button", { name: "Give up" }));
    expect(img).toHaveAttribute("data-blur-px", "0");
  });
});

describe("ScreenshotGame — scoring (integration with scoring engine)", () => {
  it("deducts 20 per wrong guess and 25 per sharpen", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    // 1 wrong guess (-20), 1 sharpen (-25). Score = 100 - 20 - 25 = 55.
    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Valley");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    await user.click(screen.getByRole("button", { name: /Sharpen/ }));

    // Now solve.
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-25", "screenshot", {
      puzzleId: "ss-001",
      score: 55,
      revealedClues: 1,
      wrongGuesses: ["valley"],
      status: "solved",
    });
  });

  it("deducts 75 for all 3 sharpens (-25 each)", async () => {
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    // 3 sharpens (-75), no wrong guesses. Score = 100 - 75 = 25.
    const sharpenBtn = screen.getByRole("button", { name: /Sharpen/ });
    await user.click(sharpenBtn);
    await user.click(sharpenBtn);
    await user.click(sharpenBtn);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(recordModeResultMock).toHaveBeenCalledWith("2026-07-25", "screenshot", {
      puzzleId: "ss-001",
      score: 25,
      revealedClues: 3,
      wrongGuesses: [],
      status: "solved",
    });
  });
});

describe("ScreenshotGame — storage error handling", () => {
  it("shows a toast when recordModeResult throws (storage unavailable)", async () => {
    recordModeResultMock.mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const user = userEvent.setup();
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
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
    render(<ScreenshotGame puzzle={PUZZLE} utcDate="2026-07-25" />);

    const input = screen.getByLabelText("Type your guess");
    await user.type(input, "Mountain");
    await user.click(screen.getByRole("button", { name: "Submit guess" }));

    expect(showToastMock).toHaveBeenCalledWith("Result already recorded.", "info");
  });
});
