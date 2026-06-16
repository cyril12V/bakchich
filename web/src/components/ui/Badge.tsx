import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "default" | "success" | "muted" | "live";
}

export function Badge({ children, variant = "default" }: Props) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: "var(--color-black)",
      color: "var(--color-white)",
    },
    success: {
      backgroundColor: "var(--color-gray-900)",
      color: "var(--color-white)",
    },
    muted: {
      backgroundColor: "var(--color-gray-100)",
      color: "var(--color-gray-600)",
    },
    live: {
      backgroundColor: "var(--color-accent)",
      color: "var(--color-accent-foreground)",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.125rem 0.5rem",
        borderRadius: "100px",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        fontFamily: "var(--font-body)",
        ...styles[variant],
      }}
    >
      {children}
    </span>
  );
}
