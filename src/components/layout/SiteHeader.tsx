"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/play/keywords", label: "Play" },
  { href: "/archive", label: "Archive" },
  { href: "/stats", label: "Stats" },
  { href: "/how-to-play", label: "How to Play" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="gtg-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: "var(--z-sticky)" as string,
        backgroundColor: "var(--color-surface-elevated)",
        borderBottom: "var(--border-default)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        className="gtg-header-inner"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
          padding: "0 var(--space-4)",
        }}
      >
        <Link
          href="/"
          aria-label="Guess the Game home"
          style={{
            fontWeight: "var(--font-weight-bold)",
            fontSize: "var(--font-size-lg)",
            color: "var(--color-text)",
            textDecoration: "none",
          }}
        >
          Guess the Game
        </Link>

        <nav
          className="gtg-nav-desktop"
          aria-label="Primary navigation"
          style={{ display: "flex", gap: "var(--space-6)" }}
        >
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={{
                  color: active
                    ? "var(--color-text)"
                    : "var(--color-text-muted)",
                  fontWeight: active
                    ? "var(--font-weight-semibold)"
                    : "var(--font-weight-regular)",
                  textDecoration: "none",
                  fontSize: "var(--font-size-sm)",
                  minHeight: "44px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
