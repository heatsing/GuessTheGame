import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("渲染 children", () => {
    render(<Button>点击我</Button>);
    expect(
      screen.getByRole("button", { name: "点击我" })
    ).toBeInTheDocument();
  });

  it("点击触发 onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>按钮</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("应用正确的 variant class", () => {
    const { rerender } = render(<Button variant="primary">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-primary");

    rerender(<Button variant="secondary">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-secondary");

    rerender(<Button variant="outline">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-outline");

    rerender(<Button variant="ghost">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-ghost");
  });

  it("应用正确的 size class", () => {
    const { rerender } = render(<Button size="sm">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-sm");

    rerender(<Button size="md">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-md");

    rerender(<Button size="lg">按钮</Button>);
    expect(screen.getByRole("button")).toHaveClass("gtg-btn-lg");
  });

  it("disabled 时不触发 onClick", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        按钮
      </Button>
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("支持原生 button 属性（如 aria-label）", () => {
    render(<Button aria-label="保存按钮">保存</Button>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "保存按钮"
    );
  });
});
