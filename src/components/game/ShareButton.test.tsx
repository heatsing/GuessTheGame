import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareButton } from "@/components/game/ShareButton";

function mockNavigator(overrides: Partial<Navigator> = {}) {
  const base: Navigator = {
    ...navigator,
    share: undefined,
    clipboard: undefined,
    ...overrides,
  } as Navigator;
  Object.defineProperty(window, "navigator", {
    value: base,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  // Restore a plain navigator without our overrides
  vi.stubGlobal("navigator", navigator);
});

describe("ShareButton", () => {
  it("uses the Web Share API when available and announces success", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share });

    render(<ShareButton text="I won!" url="/share/abc" />);
    await user.click(screen.getByRole("button", { name: /Share result/i }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: "I won!" }));
    expect(screen.getByText(/Shared/i)).toBeInTheDocument();
  });

  it("does not report an error when the user dismisses the share sheet (AbortError)", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(
      Object.assign(new DOMException("aborted", "AbortError")),
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share, clipboard: { writeText } as unknown as Clipboard });

    render(<ShareButton text="x" />);
    await user.click(screen.getByRole("button", { name: /Share result/i }));

    // Aborted → should NOT fall back to clipboard, should NOT show an error
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText(/Could not share/i)).not.toBeInTheDocument();
  });

  it("falls back to the Clipboard API when Web Share rejects (non-abort)", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(new Error("not allowed"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ share, clipboard: { writeText } as unknown as Clipboard });

    render(<ShareButton text="copy me" />);
    await user.click(screen.getByRole("button", { name: /Share result/i }));

    expect(writeText).toHaveBeenCalledWith("copy me");
    expect(screen.getByText(/Copied to clipboard/i)).toBeInTheDocument();
  });

  it("falls back to Clipboard when navigator.share is missing entirely", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigator({ clipboard: { writeText } as unknown as Clipboard });

    render(<ShareButton text="copy me" />);
    await user.click(screen.getByRole("button", { name: /Share result/i }));

    expect(writeText).toHaveBeenCalledWith("copy me");
    expect(screen.getByText(/Copied to clipboard/i)).toBeInTheDocument();
  });

  it("announces an error when both share and clipboard are unavailable", async () => {
    const user = userEvent.setup();
    mockNavigator({ share: undefined, clipboard: undefined });

    render(<ShareButton text="copy me" />);
    await user.click(screen.getByRole("button", { name: /Share result/i }));

    expect(screen.getByText(/Could not share/i)).toBeInTheDocument();
  });

  it("announces an error when the clipboard write throws", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    mockNavigator({ clipboard: { writeText } as unknown as Clipboard });

    render(<ShareButton text="copy me" />);
    await user.click(screen.getByRole("button", { name: /Share result/i }));

    expect(screen.getByText(/Could not share/i)).toBeInTheDocument();
  });
});
