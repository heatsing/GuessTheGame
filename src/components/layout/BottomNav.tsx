"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const bottomNavItems = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/daily", label: "Daily", icon: "★" },
  { href: "/play/keywords", label: "Play", icon: "▶" },
  { href: "/stats", label: "Stats", icon: "▤" },
  { href: "/archive", label: "More", icon: "≡" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="gtg-bottom-nav"
      aria-label="Mobile navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: "var(--z-bottom-nav)" as string,
        backgroundColor: "var(--color-surface-elevated)",
        borderTop: "var(--border-default)",
        display: "flex",
        justifyContent: "space-around",
        padding: "var(--space-1) 0",
      }}
    >
      {bottomNavItems.map((item) => {
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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "var(--space-1) var(--space-2)",
              minHeight: "44px",
              minWidth: "44px",
              color: active
                ? "var(--color-text)"
                : "var(--color-text-muted)",
              textDecoration: "none",
              fontSize: "var(--font-size-xs)",
              fontWeight: active
                ? "var(--font-weight-semibold)"
                : "var(--font-weight-regular)",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "20px" }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
