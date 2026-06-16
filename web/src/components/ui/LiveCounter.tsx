import { useState, useEffect, useRef } from "react";
import { formatEur } from "@/lib/api";

interface Props {
  targetCents: number;
  durationMs?: number;
  label?: string;
}

export function LiveCounter({
  targetCents = 2400,
  durationMs = 3000,
  label = "gains illustratifs / mois",
}: Props) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutExpo
      const eased =
        progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.floor(eased * targetCents));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetCents, durationMs]);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-accent-soft)",
          borderRadius: "var(--radius-lg)",
          padding: "1rem 2rem",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.25rem",
        }}
      >
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.5rem",
            fontWeight: 800,
            color: "var(--color-black)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatEur(current)}
        </span>
        <span
          style={{
            fontSize: "0.875rem",
            color: "var(--color-gray-600)",
            fontFamily: "var(--font-body)",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
