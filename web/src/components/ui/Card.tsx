import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  as?: "div" | "article" | "section";
}

export function Card({ children, style, as: Tag = "div" }: Props) {
  return (
    <Tag
      style={{
        backgroundColor: "var(--color-white)",
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
