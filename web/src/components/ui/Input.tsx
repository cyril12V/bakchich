import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, id, style, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        <label
          htmlFor={inputId}
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--color-gray-700)",
            fontFamily: "var(--font-body)",
          }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={error ? true : undefined}
          style={{
            padding: "0.625rem 0.875rem",
            border: `1px solid ${error ? "var(--color-black)" : "var(--color-gray-200)"}`,
            borderRadius: "var(--radius-md)",
            fontSize: "0.9375rem",
            fontFamily: "var(--font-body)",
            color: "var(--color-black)",
            backgroundColor: "var(--color-white)",
            outline: "none",
            transition: "border-color var(--transition-fast)",
            width: "100%",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-black)";
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? "var(--color-black)"
              : "var(--color-gray-200)";
            props.onBlur?.(e);
          }}
          {...props}
        />
        {hint && !error && (
          <p
            id={hintId}
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-gray-500)",
              fontFamily: "var(--font-body)",
            }}
          >
            {hint}
          </p>
        )}
        {error && (
          <p
            id={errorId}
            role="alert"
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-black)",
              fontWeight: 500,
              fontFamily: "var(--font-body)",
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
