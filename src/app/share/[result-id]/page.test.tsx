import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SharedResultPage from "@/app/share/[result-id]/page";

/**
 * Helper: renders the async server component by awaiting it with a fake
 * `params` promise, then passing the returned JSX to `render`.
 */
async function renderSharePage(resultId: string) {
  const jsx = await SharedResultPage({
    params: Promise.resolve({ "result-id": resultId }),
  });
  render(jsx);
}

describe("Share result page — L-1 resultId validation", () => {
  describe("valid result IDs (match ^[a-z0-9]{8,32}$)", () => {
    it("renders the shared-result shell for an 8-char alphanumeric ID", async () => {
      await renderSharePage("abc12345");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Shared Result");
      expect(screen.getByText("abc12345")).toBeInTheDocument();
    });

    it("renders the shell for the generateStaticParams placeholder", async () => {
      // "placeholder" is 11 lowercase chars — matches the regex, so the
      // prerendered static page shows the normal shell, not the fallback.
      await renderSharePage("placeholder");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Shared Result");
    });

    it("renders the shell for a 32-char ID (max length)", async () => {
      const id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
      await renderSharePage(id);
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Shared Result");
    });

    it("links back to home and how-to-play", async () => {
      await renderSharePage("abc12345");
      expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
        "href",
        "/",
      );
      expect(
        screen.getByRole("link", { name: "How to play" }),
      ).toHaveAttribute("href", "/how-to-play");
    });
  });

  describe("invalid result IDs (fallback rendered)", () => {
    it("renders 'Invalid Result' for a too-short ID (7 chars)", async () => {
      await renderSharePage("abc1234");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Invalid Result");
      expect(
        screen.getByText(/link is invalid or has expired/i),
      ).toBeInTheDocument();
    });

    it("renders 'Invalid Result' for a too-long ID (33 chars)", async () => {
      await renderSharePage("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Invalid Result");
    });

    it("renders 'Invalid Result' for uppercase letters", async () => {
      await renderSharePage("ABC12345");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Invalid Result");
    });

    it("renders 'Invalid Result' for special characters (XSS attempt)", async () => {
      await renderSharePage("<script>");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Invalid Result");
      // The raw segment must NOT be echoed into the DOM.
      expect(screen.queryByText("<script>")).not.toBeInTheDocument();
    });

    it("renders 'Invalid Result' for a path-traversal attempt", async () => {
      await renderSharePage("../../etc");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Invalid Result");
    });

    it("renders 'Invalid Result' for a URL-encoded payload", async () => {
      await renderSharePage("%3Cscript%3E");
      expect(
        screen.getByRole("heading", { level: 1 }),
      ).toHaveTextContent("Invalid Result");
    });

    it("does not echo the invalid raw segment anywhere on the page", async () => {
      const evil = "javascript:alert(1)";
      await renderSharePage(evil);
      expect(screen.queryByText(evil)).not.toBeInTheDocument();
    });

    it("still provides navigation links in the fallback", async () => {
      await renderSharePage("bad!");
      expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
        "href",
        "/",
      );
      expect(
        screen.getByRole("link", { name: "How to play" }),
      ).toHaveAttribute("href", "/how-to-play");
    });
  });
});
