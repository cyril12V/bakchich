import { useState } from "react";
import { Link } from "react-router-dom";
import { VS_CODE_EXTENSION_URL } from "@/lib/api";

interface FooterLinkProps {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}

function FooterLink({ href, external = false, children }: FooterLinkProps) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    fontSize: "0.875rem",
    color: hovered ? "var(--color-white)" : "rgba(255,255,255,0.55)",
    textDecoration: "none",
    fontFamily: "var(--font-body)",
    transition: "color var(--transition-fast)",
    display: "block",
    paddingBlock: "0.2rem",
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  );
}

interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Produit",
    links: [
      { label: "Accueil", href: "/" },
      { label: "FAQ", href: "/faq" },
      { label: "Installer l'extension", href: VS_CODE_EXTENSION_URL, external: true },
    ],
  },
  {
    title: "Annonceurs",
    links: [
      { label: "Portail annonceurs", href: "/annonceurs" },
      { label: "CGV annonceurs", href: "/cgv-annonceurs" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "CGU", href: "/cgu" },
      { label: "Confidentialité", href: "/confidentialite" },
      { label: "Mentions légales", href: "/mentions-legales" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: "var(--color-black)",
        marginTop: "4rem",
      }}
    >
      {/* Bande superieure : tagline + CTA */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: "1360px",
            margin: "0 auto",
            padding: "2.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--color-white)",
                marginBottom: "0.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              Conçu pour ceux qui regardent des spinners professionnellement.
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.45)",
                fontFamily: "var(--font-body)",
              }}
            >
              Opt-in, code public, désactivable en 1 clic.
            </p>
          </div>
          <a
            href={VS_CODE_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexShrink: 0 }}
          >
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-black)",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                fontWeight: 600,
                transition: "background-color var(--transition-fast)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-accent-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-accent)";
              }}
            >
              Installer l'extension
            </button>
          </a>
        </div>
      </div>

      {/* Corps : logo + colonnes */}
      <div
        style={{
          maxWidth: "1360px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "3rem",
          alignItems: "start",
        }}
        className="footer-grid"
      >
        {/* Favicon + description - sans boite de fond */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "280px" }}>
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
            }}
            aria-label="Bakchich - Accueil"
          >
            <img
              src="/favicon.png"
              alt=""
              width={32}
              height={32}
              style={{
                objectFit: "contain",
                filter: "invert(1) brightness(2)",
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.125rem",
                color: "var(--color-white)",
                letterSpacing: "-0.02em",
              }}
            >
              Bakchich
            </span>
          </Link>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-body)",
              lineHeight: 1.6,
            }}
          >
            La régie pub du spinner de Claude Code.
          </p>
        </div>

        {/* Colonnes de liens */}
        <nav
          aria-label="Liens du site"
          style={{
            display: "flex",
            gap: "3rem",
            flexWrap: "wrap",
          }}
          className="footer-nav"
        >
          {COLUMNS.map((col) => (
            <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body)",
                }}
              >
                {col.title}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href} external={link.external}>
                      {link.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Barre du bas */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: "1360px",
            margin: "0 auto",
            padding: "1rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-body)",
            }}
          >
            &copy; {year} Bakchich
          </span>
          <span
            style={{
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-body)",
            }}
          >
            Projet indépendant, non affilié à Anthropic.
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
          .footer-nav {
            gap: 2rem !important;
          }
        }
      `}</style>
    </footer>
  );
}
