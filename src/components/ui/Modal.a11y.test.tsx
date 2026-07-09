import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

describe("Modal accessibility", () => {
  it("marks background content inert while open so it is not focusable/announced", () => {
    render(
      <div>
        <button>Background action</button>
        <p>Background text</p>
        <Modal open onClose={() => {}} title="Confirm">
          <button>Inside modal</button>
        </Modal>
      </div>,
    );

    const bgButton = screen.getByText("Background action");
    const bgText = screen.getByText("Background text");
    expect(bgButton).toHaveAttribute("inert");
    expect(bgText).toHaveAttribute("inert");

    // Modal content itself is NOT inert and is focusable
    expect(screen.getByText("Inside modal")).not.toHaveAttribute("inert");
  });

  it("removes inert from background content when closed", () => {
    const { rerender } = render(
      <div>
        <button>Background action</button>
        <Modal open onClose={() => {}} title="Confirm">
          <p>body</p>
        </Modal>
      </div>,
    );

    const bgButton = screen.getByText("Background action");
    expect(bgButton).toHaveAttribute("inert");

    rerender(
      <div>
        <button>Background action</button>
        <Modal open={false} onClose={() => {}} title="Confirm">
          <p>body</p>
        </Modal>
      </div>,
    );

    expect(screen.getByText("Background action")).not.toHaveAttribute("inert");
  });

  it("exposes aria-describedby pointing at a description element", () => {
    render(
      <Modal open onClose={() => {}} title="Reset" describedBy="reset-desc">
        <p id="reset-desc">This will clear your local progress.</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "reset-desc");
  });

  it("traps focus and closes on Escape, restoring focus to the trigger", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Dialog">
            <button>Action</button>
          </Modal>
        </div>
      );
    }

    const { rerender } = render(<Harness />);

    // Opening via the trigger focuses it, then the dialog auto-focuses Action.
    const trigger = screen.getByText("Open");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("inert");
    expect(screen.getByText("Action")).toHaveFocus();

    // Escape closes the dialog.
    await user.keyboard("{Escape}");
    rerender(<Harness />);

    // Focus is restored to the trigger, which is no longer inert.
    expect(trigger).not.toHaveAttribute("inert");
    expect(trigger).toHaveFocus();
  });
});
