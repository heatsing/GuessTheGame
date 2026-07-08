import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/Modal";

describe("Modal", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("open=false 时不渲染", () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="标题">
        <p>内容</p>
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("内容")).not.toBeInTheDocument();
  });

  it("open=true 时渲染 children 和 title", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="标题文本">
        <p>内容文本</p>
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("标题文本")).toBeInTheDocument();
    expect(screen.getByText("内容文本")).toBeInTheDocument();
  });

  it("点击 overlay 关闭", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="标题">
        <p>内容</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    const overlay = dialog.parentElement as HTMLElement;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("点击 dialog 内容不关闭", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="标题">
        <p>内容</p>
      </Modal>
    );
    await user.click(screen.getByText("内容"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("按 Esc 关闭", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={onClose} title="标题">
        <p>内容</p>
      </Modal>
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("有 role=dialog 和 aria-modal=true", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="标题">
        <p>内容</p>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("焦点陷阱基本功能", async () => {
    const user = userEvent.setup();
    render(
      <Modal open={true} onClose={vi.fn()} title="标题">
        <button>第一个</button>
        <button>第二个</button>
      </Modal>
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);

    // Modal 自动聚焦第一个可聚焦元素
    expect(buttons[0]).toHaveFocus();

    // Tab 移动到第二个
    await user.tab();
    expect(buttons[1]).toHaveFocus();

    // 在最后一个按 Tab，应该回到第一个
    await user.tab();
    expect(buttons[0]).toHaveFocus();

    // 在第一个按 Shift+Tab，应该回到最后一个
    await user.tab({ shift: true });
    expect(buttons[1]).toHaveFocus();
  });
});
