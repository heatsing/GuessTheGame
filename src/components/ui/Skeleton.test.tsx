import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("渲染指定 width/height", () => {
    const { container } = render(
      <Skeleton width="200px" height="50px" />
    );
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass("gtg-skeleton");
    expect(skeleton.style.width).toBe("200px");
    expect(skeleton.style.height).toBe("50px");
  });

  it("支持数字类型的 width/height", () => {
    const { container } = render(<Skeleton width={120} height={40} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe("120px");
    expect(skeleton.style.height).toBe("40px");
  });

  it("有 role=status 和 aria-label", () => {
    render(<Skeleton ariaLabel="加载中" />);
    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-label", "加载中");
  });

  it("应用 rounded 到 borderRadius", () => {
    const { container } = render(<Skeleton rounded="9999px" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.borderRadius).toBe("9999px");
  });
});

describe("SkeletonBlock", () => {
  it("渲染指定行数", () => {
    const { container } = render(<SkeletonBlock lines={5} />);
    const skeletons = container.querySelectorAll(".gtg-skeleton");
    expect(skeletons).toHaveLength(5);
  });

  it("默认渲染 3 行", () => {
    const { container } = render(<SkeletonBlock />);
    const skeletons = container.querySelectorAll(".gtg-skeleton");
    expect(skeletons).toHaveLength(3);
  });

  it("有 role=status 和 aria-label", () => {
    render(<SkeletonBlock ariaLabel="加载内容" />);
    const block = screen.getByRole("status", { name: "加载内容" });
    expect(block).toHaveAttribute("aria-label", "加载内容");
  });
});
