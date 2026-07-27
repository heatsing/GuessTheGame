import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

/**
 * Modal accessibility tests.
 *
 * The Modal is portaled to `document.body` via createPortal (P1-2), so the
 * `inert` attribute is applied to the Modal's body-level siblings (i.e. the
 * testing-library container that holds the background content), not to the
 * background elements directly. We therefore assert inertness via
 * `closest("[inert]")` (inert propagates to descendants) rather than checking
 * the attribute on the element itself.
 */
function isInert(el: Element | null): boolean {
  return el?.closest("[inert]") != null;
}

describe("Modal accessibility", () => {
  it("marks background content inert while open so it is not focusable/announced", () => {
    render(
      <div>
        <button>Background action</button>
        <p>Background text</p>
        <Modal open onClose={() => {}} title="Confirm" showCloseButton={false}>
          <button>Inside modal</button>
        </Modal>
      </div>,
    );

    const bgButton = screen.getByText("Background action");
    const bgText = screen.getByText("Background text");
    expect(isInert(bgButton)).toBe(true);
    expect(isInert(bgText)).toBe(true);

    // Modal content itself is NOT inert and is focusable
    expect(isInert(screen.getByText("Inside modal"))).toBe(false);
  });

  it("removes inert from background content when closed", () => {
    const { rerender } = render(
      <div>
        <button>Background action</button>
        <Modal open onClose={() => {}} title="Confirm" showCloseButton={false}>
          <p>body</p>
        </Modal>
      </div>,
    );

    const bgButton = screen.getByText("Background action");
    expect(isInert(bgButton)).toBe(true);

    rerender(
      <div>
        <button>Background action</button>
        <Modal open={false} onClose={() => {}} title="Confirm" showCloseButton={false}>
          <p>body</p>
        </Modal>
      </div>,
    );

    expect(isInert(screen.getByText("Background action"))).toBe(false);
  });

  it("exposes aria-describedby pointing at a description element", () => {
    render(
      <Modal open onClose={() => {}} title="Reset" describedBy="reset-desc" showCloseButton={false}>
        <p id="reset-desc">This will clear your local progress.</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "reset-desc");
  });

  it("uses a stable generated id for aria-labelledby when title is present", () => {
    render(
      <Modal open onClose={() => {}} title="My Title" showCloseButton={false}>
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).not.toBeNull();
    expect(document.getElementById(labelledBy!)!.textContent).toBe("My Title");
  });

  it("falls back to aria-label when no title is provided", () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="Quick confirm" showCloseButton={false}>
        <p>body</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Quick confirm");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });

  it("traps focus and closes on Escape, restoring focus to the trigger", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Dialog" showCloseButton={false}>
            <button>Action</button>
          </Modal>
        </div>
      );
    }

    const { rerender } = render(<Harness />);

    // Opening via the trigger focuses it, then the dialog auto-focuses Action.
    const trigger = screen.getByText("Open");
    await user.click(trigger);
    expect(isInert(trigger)).toBe(true);
    expect(screen.getByText("Action")).toHaveFocus();

    // Escape closes the dialog.
    await user.keyboard("{Escape}");
    rerender(<Harness />);

    // Focus is restored to the trigger, which is no longer inert.
    expect(isInert(screen.getByText("Open"))).toBe(false);
    expect(screen.getByText("Open")).toHaveFocus();
  });
});
