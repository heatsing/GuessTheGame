import { render, screen } from "@testing-library/react";
import { ResultAnnouncer } from "@/components/game/ResultAnnouncer";

/** The visible badge is the `aria-hidden` span; the SR message is the
 *  visually-hidden span inside the aria-live region. Both must convey the
 *  outcome so it is not color-only. */
function badgeText(container: HTMLElement): string {
  return container.querySelector('span[aria-hidden="true"]')?.textContent ?? "";
}

describe("ResultAnnouncer", () => {
  it("renders a polite aria-live region (P2-38: non-urgent game results)", () => {
    const { container } = render(<ResultAnnouncer result={{ status: "idle" }} />);
    const region = container.querySelector("[aria-live]");
    // Polite, not assertive — game results are status updates, not urgent
    // alerts; assertive would interrupt AT users mid-utterance (review P2-38).
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("announces a correct result in plain text (not color-only)", () => {
    const { container } = render(
      <ResultAnnouncer result={{ status: "correct", answer: "Volcano" }} />,
    );
    expect(screen.getByText(/Correct! The answer was Volcano/i)).toBeInTheDocument();
    expect(badgeText(container)).toMatch(/✓/);
    expect(badgeText(container)).toMatch(/Correct/);
  });

  it("announces a wrong guess with the guess text", () => {
    const { container } = render(
      <ResultAnnouncer result={{ status: "wrong", guess: "mountain" }} />,
    );
    expect(screen.getByText(/mountain.*is not the answer/i)).toBeInTheDocument();
    expect(badgeText(container)).toMatch(/✗/);
    expect(badgeText(container)).toMatch(/Try again/);
  });

  it("announces giving up with the answer", () => {
    const { container } = render(
      <ResultAnnouncer result={{ status: "given_up", answer: "Compass" }} />,
    );
    expect(screen.getByText(/You gave up.*Compass/i)).toBeInTheDocument();
    expect(badgeText(container)).toMatch(/◌/);
    expect(badgeText(container)).toMatch(/Given up/);
  });

  it("renders no visible badge when idle", () => {
    const { container } = render(<ResultAnnouncer result={{ status: "idle" }} />);
    expect(container.querySelector("span[aria-hidden='true']")).toBeNull();
  });

  it("uses an icon so outcome is not conveyed by color alone", () => {
    const { container, rerender } = render(
      <ResultAnnouncer result={{ status: "correct", answer: "x" }} />,
    );
    expect(badgeText(container)).toMatch(/✓/);

    rerender(<ResultAnnouncer result={{ status: "wrong", guess: "y" }} />);
    expect(badgeText(container)).toMatch(/✗/);
  });
});
