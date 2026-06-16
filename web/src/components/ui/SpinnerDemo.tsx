import { useState, useEffect } from "react";

type Mode = "normal" | "sponsored";

interface SpinnerDisplayProps {
  mode: Mode;
  brandName?: string;
  brandIcon?: string;
  active: boolean;
}

function SpinnerDisplay({ mode, brandName, active }: SpinnerDisplayProps) {
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
      setElapsed((e) => e + 0.4);
    }, 400);
    return () => clearInterval(interval);
  }, [active]);

  const dotsStr = ".".repeat(dots);
  const elapsedStr = elapsed.toFixed(1) + "s";

  return (
    <div
      style={{
        fontFamily: "'SF Mono', 'Fira Mono', 'Cascadia Code', monospace",
        fontSize: "0.8125rem",
        color: "var(--color-gray-600)",
        backgroundColor: "var(--color-gray-50)",
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-md)",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        minHeight: "52px",
        minWidth: "0",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          animation: active ? "spin-glyph 1s linear infinite" : "none",
          transformOrigin: "center",
        }}
      >
        ✶
      </span>
      {mode === "normal" ? (
        <span aria-live="polite" aria-label={`Chargement : ${elapsedStr}`}>
          Percolating{dotsStr} {elapsedStr}
        </span>
      ) : (
        <span
          aria-live="polite"
          aria-label={`Publicité : ${brandName ?? "Votre marque ici"}`}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              backgroundColor: "var(--color-black)",
              color: "var(--color-white)",
              padding: "0.125rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            PUB
          </span>{" "}
          {brandName ?? "Votre marque ici"}{" "}
          <span style={{ color: "var(--color-gray-400)" }}>{elapsedStr}</span>
        </span>
      )}
    </div>
  );
}

export function SpinnerDemo() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes spin-glyph {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes spin-glyph {
            to { transform: none; }
          }
        }
        @media (max-width: 480px) {
          .spinner-demo-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--color-gray-400)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-body)",
          }}
        >
          Sans Bakchich
        </p>
        <SpinnerDisplay mode="normal" active={true} />
      </div>
      <div>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--color-gray-400)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "0.5rem",
            fontFamily: "var(--font-body)",
          }}
        >
          Avec Bakchich
        </p>
        <SpinnerDisplay mode="sponsored" brandName="Votre marque ici" active={true} />
      </div>
    </div>
  );
}
