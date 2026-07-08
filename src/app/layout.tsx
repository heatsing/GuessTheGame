import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: {
    default: "Guess the Game — Daily puzzle challenges",
    template: "%s — Guess the Game",
  },
  description:
    "Play five guessing game modes — Daily Mixed Challenge, Keywords, Emoji, Screenshot, and Timeline. No login, no ads, plays in under three minutes.",
  metadataBase: new URL("https://guess-the-game.vercel.app"),
  openGraph: {
    title: "Guess the Game",
    description: "Daily puzzle challenges — 5 modes, 2-3 minutes, no login.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1116",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="gtg-main">
          {children}
        </main>
        <SiteFooter />
        <BottomNav />
      </body>
    </html>
  );
}
