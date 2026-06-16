import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { VS_CODE_EXTENSION_URL, getToken, getRole } from "@/lib/api";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Rôle courant (réactif) : on n'affiche que l'univers correspondant.
  const [role, setRoleLocal] = useState(() => (getToken() ? getRole() : null));
  useEffect(() => {
    const sync = () => setRoleLocal(getToken() ? getRole() : null);
    sync();
    window.addEventListener("bakchich:role", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("bakchich:role", sync);
      window.removeEventListener("storage", sync);
    };
  }, [location.pathname]);

  // Connecté en tant que dev → seulement "Mon espace". En tant qu'annonceur →
  // seulement "Espace annonceur". Déconnecté → les deux portails (points d'entrée).
  const navLinks =
    role === "advertiser"
      ? [{ href: "/annonceurs/espace", label: "Espace annonceur" }]
      : role === "dev"
        ? [{ href: "/me", label: "Mon espace" }]
        : [
            { href: "/annonceurs", label: "Portail annonceurs" },
            { href: "/me", label: "Mon espace" },
          ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: "1360px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Groupe gauche : logo + nom + liens nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            minWidth: 0,
          }}
          className="header-left"
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
              flexShrink: 0,
              marginRight: "0.75rem",
            }}
            aria-label="Bakchich - Accueil"
          >
            <img
              src="/logo.png"
              alt=""
              width={30}
              height={30}
              style={{ borderRadius: "6px", objectFit: "contain" }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.125rem",
                color: "var(--color-black)",
                letterSpacing: "-0.02em",
              }}
            >
              Bakchich
            </span>
          </Link>

          {/* Liens de navigation */}
          <nav
            aria-label="Navigation principale"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.125rem",
            }}
            className="desktop-nav"
          >
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                to={href}
                style={{
                  padding: "0.3125rem 0.625rem",
                  borderRadius: "6px",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color:
                    location.pathname === href
                      ? "var(--color-black)"
                      : "var(--color-gray-500)",
                  textDecoration: "none",
                  fontFamily: "var(--font-body)",
                  backgroundColor:
                    location.pathname === href
                      ? "rgba(200,242,76,0.18)"
                      : "transparent",
                  transition: "all var(--transition-fast)",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Groupe droite : bouton Installer */}
        <div className="desktop-cta" style={{ flexShrink: 0 }}>
          <a
            href={VS_CODE_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1.125rem",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-black)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                fontWeight: 700,
                transition: "background-color var(--transition-fast), transform var(--transition-fast)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-accent-hover)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-accent)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              <span aria-hidden="true">🧩</span>
              Installer l'extension
            </button>
          </a>
        </div>

        {/* Burger mobile */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          style={{
            display: "none",
            padding: "0.5rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-black)",
          }}
          className="burger-btn"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Navigation mobile"
          style={{
            borderTop: "1px solid var(--color-gray-200)",
            padding: "1rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            backgroundColor: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "1rem",
                fontWeight: 500,
                color: "var(--color-black)",
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                backgroundColor:
                  location.pathname === href
                    ? "var(--color-gray-100)"
                    : "transparent",
              }}
            >
              {label}
            </Link>
          ))}
          <a
            href={VS_CODE_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: "0.5rem", textDecoration: "none" }}
            onClick={() => setMenuOpen(false)}
          >
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                justifyContent: "center",
                padding: "0.75rem 1.25rem",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-black)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                fontWeight: 700,
              }}
            >
              <span aria-hidden="true">🧩</span>
              Installer l'extension
            </button>
          </a>
        </nav>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .desktop-cta { display: none !important; }
          .burger-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
