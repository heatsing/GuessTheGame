import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("404 page", () => {
  it("renders a heading and explanation", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Page not found/i,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("provides internal links to keep the player in the game", () => {
    render(<NotFound />);
    const nav = screen.getByRole("navigation", { name: /Quick links/i });
    expect(nav).toBeInTheDocument();
    // Links to home and at least one play page
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Keywords" }),
    ).toHaveAttribute("href", "/play/keywords");
  });

  it("links are real anchors (keyboard focusable), not div onClick", () => {
    render(<NotFound />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(8);
    for (const link of links) {
      expect(link.tagName).toBe("A");
    }
  });
});
