import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

describe("Card", () => {
  it("渲染 children", () => {
    render(<Card>卡片内容</Card>);
    expect(screen.getByText("卡片内容")).toBeInTheDocument();
  });

  it("interactive=true 时有 interactive class", () => {
    const { container } = render(<Card interactive>内容</Card>);
    expect(container.firstChild).toHaveClass("gtg-card");
    expect(container.firstChild).toHaveClass("gtg-card-interactive");
  });

  it("interactive=false 时没有 interactive class", () => {
    const { container } = render(<Card>内容</Card>);
    expect(container.firstChild).toHaveClass("gtg-card");
    expect(container.firstChild).not.toHaveClass("gtg-card-interactive");
  });

  it("CardHeader 和 CardBody 渲染内容", () => {
    render(
      <Card>
        <CardHeader>标题</CardHeader>
        <CardBody>正文</CardBody>
      </Card>
    );
    const header = screen.getByText("标题");
    const body = screen.getByText("正文");
    expect(header).toHaveClass("gtg-card-header");
    expect(body).toHaveClass("gtg-card-body");
    expect(header.parentElement).toHaveClass("gtg-card");
  });

  it("透传额外 className", () => {
    const { container } = render(
      <Card className="custom-class">内容</Card>
    );
    expect(container.firstChild).toHaveClass("gtg-card");
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
