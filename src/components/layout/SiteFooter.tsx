import Link from "next/link";

const footerLinks = [
  { href: "/how-to-play", label: "How to Play" },
  { href: "/about", label: "About" },
  { href: "/archive", label: "Archive" },
  { href: "/stats", label: "Stats" },
];

export function SiteFooter() {
  return (
    <footer
      className="gtg-footer"
      style={{
        borderTop: "var(--border-default)",
        backgroundColor: "var(--color-surface)",
        padding: "var(--space-8) var(--space-4) var(--space-12)",
        marginTop: "var(--space-16)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-8)",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <p
            style={{
              fontWeight: "var(--font-weight-bold)",
              fontSize: "var(--font-size-lg)",
              marginBottom: "var(--space-2)",
            }}
          >
            Guess the Game
          </p>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
              maxWidth: "320px",
            }}
          >
            Five guessing modes, one daily challenge. No login, no ads, plays in
            under three minutes.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "var(--font-size-sm)",
                    textDecoration: "none",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
