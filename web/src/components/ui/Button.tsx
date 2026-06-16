import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "glass";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false);
    const [active, setActive] = useState(false);
    const isDisabled = disabled || loading;

    const base: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      borderRadius: "var(--radius-md)",
      border: "1px solid transparent",
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.5 : 1,
      transition: "all var(--transition-fast)",
      textDecoration: "none",
      whiteSpace: "nowrap",
      transform: hovered && !isDisabled && variant === "primary" ? "translateY(-1px)" : "translateY(0)",
      boxShadow: hovered && !isDisabled && variant === "primary"
        ? "0 4px 12px rgba(200, 242, 76, 0.4)"
        : active && variant === "primary"
        ? "0 1px 4px rgba(200, 242, 76, 0.2)"
        : "none",
    };

    const sizes: Record<string, React.CSSProperties> = {
      sm: { padding: "0.375rem 0.875rem", fontSize: "0.8125rem" },
      md: { padding: "0.625rem 1.25rem", fontSize: "0.9375rem" },
      lg: { padding: "0.875rem 1.75rem", fontSize: "1.0625rem" },
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: hovered && !isDisabled ? "var(--color-accent-hover)" : "var(--color-accent)",
        color: "var(--color-accent-foreground)",
        borderColor: hovered && !isDisabled ? "var(--color-accent-hover)" : "var(--color-accent)",
      },
      secondary: {
        backgroundColor: hovered && !isDisabled ? "var(--color-gray-100)" : "var(--color-white)",
        color: "var(--color-black)",
        borderColor: "var(--color-gray-300)",
      },
      ghost: {
        backgroundColor: hovered && !isDisabled ? "var(--color-gray-100)" : "transparent",
        color: hovered && !isDisabled ? "var(--color-black)" : "var(--color-gray-600)",
        borderColor: "transparent",
      },
      glass: {
        backgroundColor: hovered && !isDisabled
          ? "rgba(255,255,255,0.25)"
          : "rgba(255,255,255,0.15)",
        color: "var(--color-white)",
        borderColor: "rgba(255,255,255,0.3)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      },
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          setActive(false);
          onMouseLeave?.(e);
        }}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        animation: "spin 0.75s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="20 10"
        strokeLinecap="round"
      />
    </svg>
  );
}
