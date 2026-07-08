import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "@/components/ui/ErrorState";

describe("ErrorState", () => {
  it("渲染 title 和 message", () => {
    render(<ErrorState title="出错了" message="请稍后重试" />);
    expect(screen.getByText("出错了")).toBeInTheDocument();
    expect(screen.getByText("请稍后重试")).toBeInTheDocument();
  });

  it("使用默认 title", () => {
    render(<ErrorState message="发生错误" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("发生错误")).toBeInTheDocument();
  });

  it("点击 action 按钮触发 onAction", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <ErrorState
        message="发生错误"
        actionLabel="重试"
        onAction={onAction}
      />
    );
    await user.click(screen.getByRole("button", { name: "重试" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("没有 actionLabel 时不渲染按钮", () => {
    render(<ErrorState message="发生错误" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("有 actionLabel 但没有 onAction 时也不渲染按钮", () => {
    render(<ErrorState message="发生错误" actionLabel="重试" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("有 role=alert", () => {
    render(<ErrorState message="发生错误" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
