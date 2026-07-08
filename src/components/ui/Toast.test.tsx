import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

type ToastVariant = "info" | "success" | "error" | "warning";

function ToastTrigger({
  message,
  variant,
  label = "显示",
}: {
  message: string;
  variant?: ToastVariant;
  label?: string;
}) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(message, variant)}>{label}</button>
  );
}

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("showToast 后显示消息", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastTrigger message="Hello World" />
      </ToastProvider>
    );
    await user.click(screen.getByText("显示"));
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("4 秒后自动消失", () => {
    // 使用 fake timers 时，userEvent 内部的延迟定时器会导致挂起，
    // 因此这里用 fireEvent 触发点击（同步、不依赖定时器）。
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger message="自动消失" />
      </ToastProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText("显示"));
    });
    expect(screen.getByText("自动消失")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("自动消失")).not.toBeInTheDocument();
  });

  it("4 秒之前仍然可见", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger message="还在" />
      </ToastProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText("显示"));
    });
    expect(screen.getByText("还在")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3999);
    });

    expect(screen.getByText("还在")).toBeInTheDocument();
  });

  it("不同 variant 渲染", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastTrigger message="信息" variant="info" label="info" />
        <ToastTrigger message="成功" variant="success" label="success" />
        <ToastTrigger message="错误" variant="error" label="error" />
        <ToastTrigger message="警告" variant="warning" label="warning" />
      </ToastProvider>
    );
    await user.click(screen.getByText("info"));
    await user.click(screen.getByText("success"));
    await user.click(screen.getByText("error"));
    await user.click(screen.getByText("warning"));

    expect(screen.getByText("信息")).toHaveClass("gtg-toast-info");
    expect(screen.getByText("成功")).toHaveClass("gtg-toast-success");
    expect(screen.getByText("错误")).toHaveClass("gtg-toast-error");
    expect(screen.getByText("警告")).toHaveClass("gtg-toast-warning");
  });
});
