import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { usePreloadImage } from "./usePreloadImage";

/**
 * Tests for the P1-10 image preload hook.
 *
 * The hook uses `new Image()` to warm the browser's HTTP cache. In jsdom the
 * `Image` constructor exists but images never actually "load" (no network), so
 * we drive `onload`/`onerror` manually to simulate settlement.
 */

// --- Image stub ----------------------------------------------------------

interface MockImage {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

let mockImages: MockImage[];
let originalImage: typeof Image;

beforeEach(() => {
  mockImages = [];
  originalImage = global.Image;

  // Stub `Image` so we can inspect created instances and fire load events.
  global.Image = class {
    src = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() {
      mockImages.push(this);
    }
  } as unknown as typeof Image;
});

afterEach(() => {
  global.Image = originalImage;
  vi.restoreAllMocks();
});

// --- Tests ---------------------------------------------------------------

describe("usePreloadImage", () => {
  it("creates an Image with the given src", () => {
    renderHook(() => usePreloadImage("/img/foo.webp"));

    expect(mockImages).toHaveLength(1);
    expect(mockImages[0]!.src).toBe("/img/foo.webp");
  });

  it("returns loaded=false initially, then true after onload", () => {
    const { result } = renderHook(() => usePreloadImage("/img/foo.webp"));

    expect(result.current).toBe(false);

    // Simulate the image finishing its load.
    act(() => {
      mockImages[0]!.onload!();
    });

    expect(result.current).toBe(true);
  });

  it("settles on error too (never hangs on a broken URL)", () => {
    const { result } = renderHook(() => usePreloadImage("/img/missing.webp"));

    expect(result.current).toBe(false);

    act(() => {
      mockImages[0]!.onerror!();
    });

    expect(result.current).toBe(true);
  });

  it("does not create any Image when enabled=false", () => {
    renderHook(() => usePreloadImage("/img/foo.webp", false));
    expect(mockImages).toHaveLength(0);
  });

  it("returns loaded=true immediately when enabled=false", () => {
    const { result } = renderHook(() =>
      usePreloadImage("/img/foo.webp", false),
    );
    expect(result.current).toBe(true);
  });

  it("returns loaded=true when urls is undefined (nothing to preload)", () => {
    const { result } = renderHook(() => usePreloadImage(undefined));
    expect(result.current).toBe(true);
    expect(mockImages).toHaveLength(0);
  });

  it("returns loaded=true when urls is null", () => {
    const { result } = renderHook(() => usePreloadImage(null));
    expect(result.current).toBe(true);
  });

  it("handles an array of URLs and waits for all to settle", () => {
    const { result } = renderHook(() =>
      usePreloadImage(["/img/a.webp", "/img/b.webp", "/img/c.webp"]),
    );

    expect(mockImages).toHaveLength(3);
    expect(result.current).toBe(false);

    // Two settle — still waiting on the third.
    act(() => {
      mockImages[0]!.onload!();
      mockImages[1]!.onerror!();
    });
    expect(result.current).toBe(false);

    // Third settles — all done.
    act(() => {
      mockImages[2]!.onload!();
    });
    expect(result.current).toBe(true);
  });

  it("cleans up on unmount (cancels pending loads)", () => {
    const { unmount } = renderHook(() => usePreloadImage("/img/foo.webp"));

    expect(mockImages).toHaveLength(1);
    expect(mockImages[0]!.src).toBe("/img/foo.webp");

    unmount();

    // Cleanup clears handlers and blanks the src so the browser cancels.
    expect(mockImages[0]!.onload).toBeNull();
    expect(mockImages[0]!.onerror).toBeNull();
    expect(mockImages[0]!.src).toBe("");
  });

  it("does not re-run when an array literal is passed (stable dependency)", () => {
    // A new array reference on every render should NOT retrigger the effect.
    // We verify by re-rendering with a fresh array and checking no new Image
    // instances are created.
    const { rerender } = renderHook(() =>
      usePreloadImage(["/img/a.webp", "/img/b.webp"]),
    );

    expect(mockImages).toHaveLength(2);

    rerender();
    rerender();
    rerender();

    // Still only 2 — the serialized key is stable.
    expect(mockImages).toHaveLength(2);
  });

  it("re-runs when the URL actually changes", () => {
    const { result, rerender } = renderHook(
      ({ url }) => usePreloadImage(url),
      { initialProps: { url: "/img/a.webp" as string } },
    );

    expect(mockImages).toHaveLength(1);

    // Settle the first image.
    act(() => {
      mockImages[0]!.onload!();
    });
    expect(result.current).toBe(true);

    // Change the URL — should create a new Image and reset to loaded=false.
    rerender({ url: "/img/b.webp" });

    expect(mockImages).toHaveLength(2);
    expect(mockImages[1]!.src).toBe("/img/b.webp");
    expect(result.current).toBe(false);

    act(() => {
      mockImages[1]!.onload!();
    });
    expect(result.current).toBe(true);
  });
});
