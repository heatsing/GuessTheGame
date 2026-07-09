import { act, render, screen } from "@testing-library/react";
import { GameImage } from "@/components/game/GameImage";

describe("GameImage", () => {
  it("renders an img with alt text and fixed dimensions", () => {
    render(<GameImage src="/img.png" alt="A volcano" width={400} height={300} />);
    const img = screen.getByRole("img", { name: "A volcano" });
    expect(img).toHaveAttribute("src", "/img.png");
    expect(img).toHaveAttribute("width", "400");
    expect(img).toHaveAttribute("height", "300");
  });

  it("lazy-loads below-fold images by default", () => {
    render(<GameImage src="/img.png" alt="clue" width={400} height={300} />);
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("img")).toHaveAttribute("decoding", "async");
  });

  it("eager-loads + high priority for the first clue", () => {
    render(
      <GameImage src="/img.png" alt="clue" width={400} height={300} priority />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
  });

  it("shows an accessible fallback when the image fails to load", async () => {
    const onError = vi.fn();
    render(
      <GameImage
        src="/missing.png"
        alt="A volcano"
        width={400}
        height={300}
        onError={onError}
      />,
    );
    const img = screen.getByRole("img", { name: "A volcano" });
    await act(async () => {
      img.dispatchEvent(new Event("error"));
    });

    const fallback = await screen.findByRole("img", {
      name: /Image failed to load: A volcano/i,
    });
    expect(fallback).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
  });

  it("reserves space via aspect-ratio to avoid CLS", () => {
    render(<GameImage src="/img.png" alt="clue" width={400} height={300} />);
    const img = screen.getByRole("img");
    expect((img as HTMLElement).style.aspectRatio).toBe("400 / 300");
  });
});
